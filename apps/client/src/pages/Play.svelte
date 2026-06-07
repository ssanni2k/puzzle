<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '../lib/api.js';
  import { auth } from '../stores/auth.js';
  import { progressStore } from '../stores/progress.js';
  import { resetZ } from '../lib/dnd.js';
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

  onMount(() => {
    puzzleId = window.location.pathname.split('/').pop() ?? '';
    loadPuzzle();
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
        const contoursData = await fetch(puzzle.contoursUrl).then((r) => r.json()) as PuzzleContours;
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
  }

  function handleLock(pieceId: string, targetX: number, targetY: number) {
    progressStore.lockPiece(pieceId, targetX, targetY);
    const allLocked = Object.values(progressStore.state.pieces).every((p) => p.locked);
    if (allLocked) {
      completed = true;
    }
  }

  function handleMoveEnd(pieceId: string, x: number, y: number) {
    const existing = progressStore.state.pieces[pieceId];
    if (existing && !existing.locked) {
      progressStore.movePiece(pieceId, x, y, existing.rotation);
    }
    progressStore.saveToLocalStorage();
  }

  function handleReset() {
    if (!contours) return;
    progressStore.reset(puzzleId);
    progressStore.initFromContours(puzzleId, contours.pieces, contours.width, contours.height);
    resetZ();
    completed = false;
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
        <button class="reset-btn" onclick={handleReset}>Сбросить</button>
      </div>

      <PuzzleBoard
        pieces={contours.pieces}
        piecesBaseUrl={piecesBaseUrl}
        boardWidth={contours.width}
        boardHeight={contours.height}
        pieceStates={progressStore.state.pieces}
        scale={scale}
        onlock={handleLock}
        onmoveend={handleMoveEnd}
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
  }

  .back-btn {
    color: #4299e1;
    text-decoration: none;
    font-size: 0.9rem;
  }

  .back-btn:hover {
    text-decoration: underline;
  }

  .title {
    font-weight: 600;
    font-size: 1.1rem;
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
</style>