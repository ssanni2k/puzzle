<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '../lib/api.js';
  import { auth } from '../stores/auth.js';
  import { extractIdFromPath } from '../lib/routing.js';

  interface PuzzleDetail {
    id: string;
    userId: string;
    title: string;
    gridCols: number;
    gridRows: number;
    imageKey: string;
    contoursKey: string | null;
    status: string;
    isPublic: boolean;
    completionsCount: number;
    imageUrl: string;
    contoursUrl?: string;
    piecesBaseUrl?: string;
    createdAt: string;
  }

  let id = $state('');
  let puzzle = $state<PuzzleDetail | null>(null);
  let error = $state('');
  let loading = $state(true);
  let showReportModal = $state(false);
  let reportReason = $state('');
  let reportError = $state('');
  let reportSuccess = $state(false);
  let reportSubmitting = $state(false);

  onMount(() => {
    id = extractIdFromPath('/puzzle');
    loadPuzzle();
  });

  async function loadPuzzle() {
    loading = true;
    try {
      puzzle = await api.get<PuzzleDetail>(`/puzzles/${id}`);
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Failed to load puzzle';
    } finally {
      loading = false;
    }
  }

  let pollInterval: ReturnType<typeof setInterval>;
  onMount(() => {
    pollInterval = setInterval(() => {
      if (puzzle?.status === 'pending' || puzzle?.status === 'processing') {
        loadPuzzle();
      }
    }, 3000);
    return () => clearInterval(pollInterval);
  });

  async function toggleVisibility() {
    if (!puzzle) return;
    try {
      const updated = await api.patch<PuzzleDetail>(`/puzzles/${puzzle.id}`, {
        isPublic: !puzzle.isPublic,
      });
      puzzle = updated;
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Failed to update';
    }
  }

  async function deletePuzzle() {
    if (!puzzle) return;
    if (!confirm('Удалить пазл? Это действие необратимо.')) return;
    try {
      await api.delete(`/puzzles/${puzzle.id}`);
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Failed to delete';
    }
  }

  async function submitReport() {
    if (!puzzle) return;
    reportSubmitting = true;
    reportError = '';
    try {
      await api.post('/reports', { puzzleId: puzzle.id, reason: reportReason });
      reportSuccess = true;
      reportReason = '';
    } catch (e: unknown) {
      reportError = e instanceof Error ? e.message : 'Ошибка отправки жалобы';
    } finally {
      reportSubmitting = false;
    }
  }

  function closeReportModal() {
    showReportModal = false;
    reportSuccess = false;
    reportError = '';
  }

  const isOwner = $derived(auth.state.isAuthenticated && auth.state.user?.id === puzzle?.userId);
  const canPlay = $derived(puzzle?.status === 'ready' && (puzzle?.isPublic || isOwner));
  const canReport = $derived(auth.state.isAuthenticated && !isOwner && puzzle?.isPublic);
</script>

<div class="detail">
  {#if loading}
    <p>Загрузка...</p>
  {:else if error}
    <p class="error">{error}</p>
  {:else if puzzle}
    <div class="header">
      <h1>{puzzle.title}</h1>
      <span class="badge">{puzzle.gridCols}×{puzzle.gridRows}</span>
      <span class="status status-{puzzle.status}">
        {#if puzzle.status === 'pending'}Ожидание{:else if puzzle.status === 'processing'}Готовится{:else if puzzle.status === 'ready'}Готов{:else}Ошибка{/if}
      </span>
    </div>

    <div class="image-container">
      <img src={puzzle.imageUrl} alt={puzzle.title} />
    </div>

    <div class="meta">
      <span>Собран {puzzle.completionsCount} раз</span>
    </div>

    {#if canPlay}
      <a href="/play/{puzzle.id}" class="play-btn">Собрать пазл</a>
    {/if}

    <div class="actions">
      {#if isOwner}
        <button onclick={toggleVisibility}>
          {puzzle.isPublic ? 'Сделать приватным' : 'Опубликовать'}
        </button>
        <button class="danger" onclick={deletePuzzle}>Удалить</button>
      {/if}

      {#if canReport}
        <button class="report-btn" onclick={() => showReportModal = true}>Пожаловаться</button>
      {/if}
    </div>
  {/if}
</div>

{#if showReportModal}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="modal-overlay" onclick={closeReportModal} role="dialog" aria-modal="true" tabindex="-1">
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="modal" onclick={(e) => e.stopPropagation()} role="document">
      {#if reportSuccess}
        <h3>Жалоба отправлена</h3>
        <p>Спасибо, мы рассмотрим вашу жалобу.</p>
        <button onclick={closeReportModal}>Закрыть</button>
      {:else}
        <h3>Пожаловаться на пазл</h3>

        {#if reportError}
          <p class="error">{reportError}</p>
        {/if}

        <label>
          Причина
          <textarea bind:value={reportReason} rows="4" placeholder="Опишите проблему..."></textarea>
        </label>

        <div class="modal-actions">
          <button class="cancel-btn" onclick={closeReportModal}>Отмена</button>
          <button onclick={submitReport} disabled={reportSubmitting}>
            {reportSubmitting ? 'Отправка...' : 'Отправить'}
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .detail { max-width: 800px; margin: 0 auto; }

  .header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  h1 { margin: 0; }

  .badge {
    background: #ebf8ff;
    color: #2b6cb0;
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    font-size: 0.8rem;
  }

  .status {
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    font-size: 0.8rem;
  }

  .status-pending { background: #fefcbf; color: #975a16; }
  .status-processing { background: #ebf8ff; color: #2b6cb0; }
  .status-ready { background: #f0fff4; color: #276749; }
  .status-error { background: #fff5f5; color: #c53030; }

  .image-container {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 1rem;
  }

  img {
    width: 100%;
    display: block;
  }

  .meta {
    color: #718096;
    font-size: 0.9rem;
    margin-bottom: 1.5rem;
  }

  .play-btn {
    display: inline-block;
    padding: 0.75rem 2rem;
    background: #48bb78;
    color: white;
    text-decoration: none;
    border-radius: 6px;
    font-size: 1.1rem;
    margin-bottom: 1.5rem;
  }

  .play-btn:hover { background: #38a169; }

  .actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  button {
    padding: 0.5rem 1rem;
    background: #4299e1;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  }

  button:hover { background: #3182ce; }

  button.danger { background: #e53e3e; }
  button.danger:hover { background: #c53030; }

  .report-btn {
    background: #edf2f7;
    color: #4a5568;
    border: 1px solid #e2e8f0;
  }

  .report-btn:hover { background: #e2e8f0; }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  }

  .modal {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    width: 100%;
    max-width: 480px;
  }

  .modal h3 { margin: 0 0 1rem; }

  .modal label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.875rem;
    color: #555;
    margin-bottom: 1rem;
  }

  .modal textarea {
    padding: 0.5rem 0.75rem;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 1rem;
    resize: vertical;
  }

  .modal-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
  }

  .cancel-btn {
    background: #edf2f7;
    color: #4a5568;
  }

  .cancel-btn:hover { background: #e2e8f0; }

  .error { color: #e53e3e; }

  @media (max-width: 640px) {
    h1 { font-size: 1.5rem; }

    .modal {
      margin: 1rem;
      padding: 1.25rem;
    }

    .play-btn {
      display: block;
      text-align: center;
    }
  }
</style>