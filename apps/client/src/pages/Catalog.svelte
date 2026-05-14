<script lang="ts">
  import { onMount } from 'svelte';
  import { auth } from '../stores/auth.js';
  import { api } from '../lib/api.js';

  interface PuzzleItem {
    id: string;
    title: string;
    gridCols: number;
    gridRows: number;
    status: string;
    isPublic: boolean;
    completionsCount: number;
    imageUrl: string;
    createdAt: string;
  }

  let puzzles = $state<PuzzleItem[]>([]);
  let total = $state(0);
  let page = $state(1);
  let limit = $state(20);
  let search = $state('');
  let showMine = $state(false);
  let loading = $state(true);

  async function loadPuzzles() {
    loading = true;
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search ? { search } : {}),
        ...(showMine ? { mine: 'true' } : {}),
      });
      const data = await api.get<{ items: PuzzleItem[]; total: number }>(`/puzzles?${params}`);
      puzzles = data.items;
      total = data.total;
    } catch (e) {
      console.error('Failed to load puzzles:', e);
    } finally {
      loading = false;
    }
  }

  onMount(loadPuzzles);

  let searchTimeout: ReturnType<typeof setTimeout>;
  function onSearchInput() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      page = 1;
      loadPuzzles();
    }, 300);
  }

  function toggleMine() {
    showMine = !showMine;
    page = 1;
    loadPuzzles();
  }

  const totalPages = $derived(Math.ceil(total / limit));
</script>

<div class="catalog">
  <h1>Каталог пазлов</h1>

  <div class="toolbar">
    <input type="text" bind:value={search} oninput={onSearchInput} placeholder="Поиск по названию..." />

    {#if auth.state.isAuthenticated}
      <button class:active={showMine} onclick={toggleMine}>
        {showMine ? 'Все пазлы' : 'Мои пазлы'}
      </button>
    {/if}
  </div>

  {#if loading}
    <p class="loading">Загрузка...</p>
  {:else if puzzles.length === 0}
    <p class="empty">Пазлы не найдены</p>
  {:else}
    <div class="grid">
      {#each puzzles as puzzle}
        <a href="/puzzle/{puzzle.id}" class="card">
          <div class="card-image" style="background-image: url({puzzle.imageUrl})"></div>
          <div class="card-info">
            <h3>{puzzle.title}</h3>
            <span class="badge">{puzzle.gridCols}×{puzzle.gridRows}</span>
            <span class="meta">Собран {puzzle.completionsCount} раз</span>
          </div>
        </a>
      {/each}
    </div>

    {#if totalPages > 1}
      <div class="pagination">
        <button disabled={page <= 1} onclick={() => { page--; loadPuzzles(); }}>←</button>
        <span>{page} / {totalPages}</span>
        <button disabled={page >= totalPages} onclick={() => { page++; loadPuzzles(); }}>→</button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .catalog { max-width: 1200px; margin: 0 auto; }
  h1 { margin-bottom: 1.5rem; }

  .toolbar {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
    align-items: center;
  }

  input {
    flex: 1;
    padding: 0.5rem 0.75rem;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 1rem;
  }

  button {
    padding: 0.5rem 1rem;
    background: #4299e1;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.875rem;
  }

  button:hover { background: #3182ce; }
  button.active { background: #2b6cb0; }
  button:disabled { opacity: 0.5; cursor: not-allowed; }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1.5rem;
  }

  .card {
    text-decoration: none;
    color: inherit;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
    transition: box-shadow 0.2s;
  }

  .card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }

  .card-image {
    height: 180px;
    background-size: cover;
    background-position: center;
    background-color: #edf2f7;
  }

  .card-info { padding: 0.75rem; }
  .card-info h3 { margin: 0 0 0.5rem; font-size: 1rem; }

  .badge {
    display: inline-block;
    background: #ebf8ff;
    color: #2b6cb0;
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    margin-right: 0.5rem;
  }

  .meta { font-size: 0.8rem; color: #718096; }

  .pagination {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-top: 2rem;
    align-items: center;
  }

  .loading, .empty {
    text-align: center;
    color: #718096;
    padding: 3rem 0;
  }
</style>