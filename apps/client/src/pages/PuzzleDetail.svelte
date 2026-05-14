<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '../lib/api.js';
  import { auth } from '../stores/auth.js';

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
    createdAt: string;
  }

  let id = $state('');
  let puzzle = $state<PuzzleDetail | null>(null);
  let error = $state('');
  let loading = $state(true);

  onMount(() => {
    id = window.location.pathname.split('/').pop() ?? '';
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

  const isOwner = $derived(auth.state.isAuthenticated && auth.state.user?.id === puzzle?.userId);
  const canPlay = $derived(puzzle?.status === 'ready' && (puzzle?.isPublic || isOwner));
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

    {#if isOwner}
      <div class="owner-actions">
        <button onclick={toggleVisibility}>
          {puzzle.isPublic ? 'Сделать приватным' : 'Опубликовать'}
        </button>
        <button class="danger" onclick={deletePuzzle}>Удалить</button>
      </div>
    {/if}
  {/if}
</div>

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

  .owner-actions {
    display: flex;
    gap: 0.75rem;
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

  button.danger {
    background: #e53e3e;
  }

  button.danger:hover { background: #c53030; }

  .error { color: #e53e3e; }
</style>