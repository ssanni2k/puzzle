<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '../lib/api.js';
  import { auth } from '../stores/auth.js';
  import { progressStore } from '../stores/progress.js';
  import { resetZ } from '../lib/dnd.js';
  import { createProgressWS } from '../lib/ws.js';
  import { extractIdFromPath } from '../lib/routing.js';
  import PuzzleBoard from '../components/PuzzleBoard.svelte';
  import type { PieceData, PuzzleContours } from '@puzzle-app/shared';

  interface PuzzleData {
    id: string;
    title: string;
    gridCols: number;
    gridRows: number;
    status: string;
    isPublic: boolean;
    imageUrl: string;
    contoursUrl?: string;
    piecesBaseUrl?: string;
  }

  interface HintHighlight {
    targetX: number;
    targetY: number;
    width: number;
    height: number;
  }

  const PADDING = 200;

  let puzzleId = $state('');
  let puzzle = $state<PuzzleData | null>(null);
  let contours = $state<PuzzleContours | null>(null);
  let piecesBaseUrl = $state('');
  let loading = $state(true);
  let error = $state('');
  let imagesLoaded = $state(false);
  let completed = $state(false);

  let containerEl: HTMLElement | undefined = $state();
  let scale = $state(1);
  let ws: ReturnType<typeof createProgressWS> | null = null;

  let hintMode = $state(false);
  let hintHighlight = $state<HintHighlight | null>(null);
  let showOriginal = $state(false);
  let originalTimer: ReturnType<typeof setTimeout> | null = null;

  let hintHighlightTimer: ReturnType<typeof setTimeout> | null = null;

  onMount(() => {
    puzzleId = extractIdFromPath('/play');
    loadPuzzle();

    return () => {
      ws?.close();
      if (originalTimer) clearTimeout(originalTimer);
      if (hintHighlightTimer) clearTimeout(hintHighlightTimer);
    };
  });

  async function loadPuzzle() {
    loading = true;
    error = '';
    try {
      puzzle = await api.get<PuzzleData>(`/puzzles/${puzzleId}`);
      if (puzzle.status !== 'ready') {
        error = 'Пазл ещё не готов';
        return;
      }
      if (puzzle.contoursUrl && puzzle.piecesBaseUrl) {
        const res = await fetch(puzzle.contoursUrl);
        if (!res.ok) {
          error = 'Не удалось загрузить данные пазла';
          return;
        }
        const contoursData = await res.json() as PuzzleContours;
        contours = contoursData;
        piecesBaseUrl = puzzle.piecesBaseUrl;
        await preloadImages(contoursData.pieces, piecesBaseUrl);
        initGameState(contoursData);
      } else {
        error = 'Данные пазла недоступны';
      }
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Ошибка загрузки';
    } finally {
      loading = false;
    }
  }

  async function preloadImages(pieces: PieceData[], baseUrl: string): Promise<void> {
    imagesLoaded = false;
    const promises = pieces.map(
      (p) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = `${baseUrl}/${p.id}.png`;
        }),
    );
    await Promise.all(promises);
    imagesLoaded = true;
  }

  async function initGameState(contoursData: PuzzleContours) {
    resetZ();

    let savedState = null as Record<string, { x: number; y: number; rotation: number; locked: boolean }> | null;

    if (auth.state.isAuthenticated) {
      const serverState = await progressStore.loadFromServer(puzzleId);
      if (serverState) {
        savedState = serverState.pieces;
      }
    }

    if (!savedState) {
      const localState = progressStore.loadFromLocalStorage(puzzleId);
      if (localState) {
        savedState = localState.pieces;
      }
    }

    if (savedState) {
      progressStore.load({
        puzzleId,
        pieces: savedState,
        completed: false,
      });
    } else {
      progressStore.initFromContours(puzzleId, contoursData.pieces, contoursData.width, contoursData.height);
    }

    completed = Object.values(progressStore.state.pieces).every((p) => p.locked);

    if (auth.state.isAuthenticated) {
      ws = createProgressWS({
        puzzleId,
        onLock: (data) => {
          progressStore.onRemoteLock(data.pieceId, data.targetX, data.targetY);
          const allLocked = Object.values(progressStore.state.pieces).every((p) => p.locked);
          if (allLocked) {
            completed = true;
          }
        },
        onComplete: () => {
          completed = true;
        },
      });
    }
  }

  function handleLock(pieceId: string, targetX: number, targetY: number) {
    progressStore.lockPiece(pieceId, targetX, targetY);
    ws?.sendLock(pieceId, targetX, targetY);

    const allLocked = Object.values(progressStore.state.pieces).every((p) => p.locked);
    if (allLocked) {
      completed = true;
      ws?.sendComplete();
    }
  }

  function handleMoveEnd(pieceId: string, x: number, y: number) {
    const existing = progressStore.state.pieces[pieceId];
    if (existing && !existing.locked) {
      progressStore.movePiece(pieceId, x, y, existing.rotation);
    }
  }

  function handleHintSelect(pieceId: string) {
    if (!contours) return;
    hintMode = false;

    const piece = contours.pieces.find((p) => p.id === pieceId);
    if (!piece) return;

    hintHighlight = {
      targetX: piece.targetX,
      targetY: piece.targetY,
      width: piece.width,
      height: piece.height,
    };

    hintHighlightTimer = setTimeout(() => {
      hintHighlight = null;
    }, 2500);
  }

  function handleHintPlace() {
    hintMode = !hintMode;
    hintHighlight = null;
  }

  function handleHintOriginal() {
    if (originalTimer) {
      clearTimeout(originalTimer);
      originalTimer = null;
    }
    showOriginal = true;
    originalTimer = setTimeout(() => {
      showOriginal = false;
      originalTimer = null;
    }, 4000);
  }

  function cancelHint() {
    hintMode = false;
    hintHighlight = null;
  }

  async function handleReset() {
    if (!contours) return;
    ws?.close();
    await progressStore.resetWithServer(puzzleId, auth.state.isAuthenticated);
    progressStore.initFromContours(puzzleId, contours.pieces, contours.width, contours.height);
    resetZ();
    completed = false;
    hintMode = false;
    hintHighlight = null;

    if (auth.state.isAuthenticated) {
      ws = createProgressWS({
        puzzleId,
        onLock: (data) => {
          progressStore.onRemoteLock(data.pieceId, data.targetX, data.targetY);
          const allLocked = Object.values(progressStore.state.pieces).every((p) => p.locked);
          if (allLocked) {
            completed = true;
          }
        },
        onComplete: () => {
          completed = true;
        },
      });
    }
  }

  $effect(() => {
    if (!containerEl) return;
    const observer = new ResizeObserver(() => {
      const rect = containerEl!.getBoundingClientRect();
      const totalW = contours ? contours.width + PADDING * 2 : 1200;
      const totalH = contours ? contours.height + PADDING * 2 : 1000;
      scale = Math.min(rect.width / totalW, rect.height / totalH, 1);
    });
    observer.observe(containerEl);
    return () => observer.disconnect();
  });
</script>

<div class="play-page" bind:this={containerEl}>
  {#if loading}
    <div class="loading">
      <p>Загрузка пазла...</p>
    </div>
  {:else if error}
    <div class="error-box">
      <p>{error}</p>
      <a href="/puzzle/{puzzleId}">Назад к пазлу</a>
    </div>
  {:else if contours && imagesLoaded}
    {#if completed}
      <div class="completion-overlay">
        <div class="completion-card">
          <h2>Поздравляем!</h2>
          <p>Вы собрали пазл «{puzzle?.title}»!</p>
          <div class="completion-actions">
            <button onclick={handleReset}>Собрать заново</button>
            <a href="/" class="back-link">Каталог</a>
          </div>
        </div>
      </div>
    {:else}
      <div class="toolbar">
        <a href="/puzzle/{puzzleId}" class="back-btn">← Назад</a>
        <span class="title">{puzzle?.title}</span>
        <div class="toolbar-actions">
          {#if hintMode}
            <button class="hint-btn active" onclick={cancelHint}>Отмена</button>
            <span class="hint-hint">Выберите кусочек</span>
          {:else}
            <button class="hint-btn" onclick={handleHintPlace}>💡 Место</button>
            <button class="hint-btn" onclick={handleHintOriginal}>👁 Оригинал</button>
          {/if}
          <button class="reset-btn" onclick={handleReset}>Сбросить</button>
        </div>
      </div>

      <PuzzleBoard
        pieces={contours.pieces}
        piecesBaseUrl={piecesBaseUrl}
        boardWidth={contours.width}
        boardHeight={contours.height}
        pieceStates={progressStore.state.pieces}
        scale={scale}
        hintMode={hintMode}
        hintHighlight={hintHighlight}
        showOriginal={showOriginal}
        originalImageUrl={puzzle?.imageUrl ?? ''}
        onlock={handleLock}
        onmoveend={handleMoveEnd}
        onhintselect={handleHintSelect}
      />
    {/if}
  {:else}
    <div class="loading">
      <p>Загрузка изображений...</p>
    </div>
  {/if}
</div>

<style>
  .play-page {
    width: 100%;
    min-height: 80vh;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .loading {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 60vh;
    color: #718096;
    font-size: 1.1rem;
  }

  .error-box {
    text-align: center;
    padding: 3rem;
    color: #e53e3e;
  }

  .error-box a {
    display: block;
    margin-top: 1rem;
    color: #4299e1;
  }

  .toolbar {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
    padding: 0.5rem 0;
    gap: 0.75rem;
  }

  .back-btn {
    color: #4299e1;
    text-decoration: none;
    font-size: 0.9rem;
    white-space: nowrap;
  }

  .back-btn:hover {
    text-decoration: underline;
  }

  .title {
    font-weight: 600;
    font-size: 1.1rem;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .toolbar-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .hint-btn {
    padding: 0.4rem 0.75rem;
    background: #fefcbf;
    border: 1px solid #d69e2e;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85rem;
    color: #744210;
  }

  .hint-btn:hover {
    background: #fef9c3;
  }

  .hint-btn.active {
    background: #4299e1;
    color: white;
    border-color: #4299e1;
  }

  .hint-hint {
    font-size: 0.85rem;
    color: #718096;
    white-space: nowrap;
  }

  .reset-btn {
    padding: 0.4rem 0.75rem;
    background: #edf2f7;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85rem;
    color: #4a5568;
  }

  .reset-btn:hover {
    background: #e2e8f0;
  }

  .completion-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  }

  .completion-card {
    background: white;
    border-radius: 12px;
    padding: 2.5rem;
    text-align: center;
    max-width: 400px;
  }

  .completion-card h2 {
    margin: 0 0 0.5rem;
    color: #276749;
  }

  .completion-card p {
    color: #4a5568;
    margin-bottom: 1.5rem;
  }

  .completion-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }

  .completion-actions button {
    padding: 0.6rem 1.5rem;
    background: #48bb78;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 1rem;
  }

  .completion-actions button:hover {
    background: #38a169;
  }

  .back-link {
    padding: 0.6rem 1.5rem;
    background: #edf2f7;
    color: #4a5568;
    text-decoration: none;
    border-radius: 6px;
    font-size: 1rem;
    display: flex;
    align-items: center;
  }

  .back-link:hover {
    background: #e2e8f0;
  }

  @media (max-width: 640px) {
    .toolbar {
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .title {
      font-size: 0.95rem;
      order: -1;
      width: 100%;
      flex-basis: 100%;
    }

    .toolbar-actions {
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .hint-btn, .reset-btn {
      font-size: 0.8rem;
      padding: 0.35rem 0.6rem;
    }

    .hint-hint {
      font-size: 0.8rem;
    }

    .completion-card {
      margin: 1rem;
      padding: 1.5rem;
    }

    .completion-actions {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>