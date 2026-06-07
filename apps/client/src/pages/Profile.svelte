<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '../lib/api.js';
  import { auth } from '../stores/auth.js';

  interface ProfileData {
    id: string;
    username: string;
    email: string;
    createdAt: string;
    stats: { puzzlesCreated: number; puzzlesCompleted: number };
  }

  interface PuzzleItem {
    id: string;
    title: string;
    gridCols: number;
    gridRows: number;
    status: string;
    isPublic: boolean;
    completionsCount: number;
    imageUrl: string;
  }

  let profile = $state<ProfileData | null>(null);
  let myPuzzles = $state<PuzzleItem[]>([]);
  let error = $state('');
  let loading = $state(true);

  let oldPassword = $state('');
  let newPassword = $state('');
  let confirmPassword = $state('');
  let passwordError = $state('');
  let passwordSuccess = $state(false);
  let changingPassword = $state(false);

  onMount(async () => {
    await loadProfile();
    await loadMyPuzzles();
  });

  async function loadProfile() {
    loading = true;
    try {
      profile = await api.get<ProfileData>('/profile');
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Failed to load profile';
    } finally {
      loading = false;
    }
  }

  async function loadMyPuzzles() {
    try {
      const data = await api.get<{ items: PuzzleItem[]; total: number }>('/puzzles?mine=true&limit=100');
      myPuzzles = data.items;
    } catch {
      // ignore
    }
  }

  async function handleChangePassword(e: SubmitEvent) {
    e.preventDefault();
    passwordError = '';
    passwordSuccess = false;

    if (newPassword !== confirmPassword) {
      passwordError = 'Пароли не совпадают';
      return;
    }

    if (newPassword.length < 8) {
      passwordError = 'Пароль должен быть не менее 8 символов';
      return;
    }

    changingPassword = true;
    try {
      await api.patch('/profile/password', { oldPassword, newPassword });
      passwordSuccess = true;
      oldPassword = '';
      newPassword = '';
      confirmPassword = '';
    } catch (e: unknown) {
      passwordError = e instanceof Error ? e.message : 'Ошибка смены пароля';
    } finally {
      changingPassword = false;
    }
  }

  function navigate(path: string) {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('ru-RU');
  }
</script>

{#if loading}
  <p class="loading">Загрузка...</p>
{:else if error}
  <p class="error">{error}</p>
{:else if profile}
  <div class="profile-page">
    <div class="profile-header">
      <h1>{profile.username}</h1>
      <p class="email">{profile.email}</p>
      <p class="created">На платформе с {formatDate(profile.createdAt)}</p>
    </div>

    <div class="stats">
      <div class="stat">
        <span class="stat-number">{profile.stats.puzzlesCreated}</span>
        <span class="stat-label">Создано пазлов</span>
      </div>
      <div class="stat">
        <span class="stat-number">{profile.stats.puzzlesCompleted}</span>
        <span class="stat-label">Собрано пазлов</span>
      </div>
    </div>

    <section class="my-puzzles">
      <h2>Мои пазлы</h2>
      {#if myPuzzles.length === 0}
        <p class="empty">У вас пока нет пазлов</p>
      {:else}
        <div class="puzzle-grid">
          {#each myPuzzles as puzzle}
            <a href="/puzzle/{puzzle.id}" class="card" onclick={() => navigate(`/puzzle/${puzzle.id}`)}>
              <div class="card-image" style="background-image: url({puzzle.imageUrl})"></div>
              <div class="card-info">
                <h3>{puzzle.title}</h3>
                <span class="badge">{puzzle.gridCols}×{puzzle.gridRows}</span>
                {#if puzzle.isPublic}
                  <span class="badge public">Публичный</span>
                {:else}
                  <span class="badge private">Приватный</span>
                {/if}
                <span class="status status-{puzzle.status}">
                  {#if puzzle.status === 'pending'}Ожидание{:else if puzzle.status === 'processing'}Готовится{:else if puzzle.status === 'ready'}Готов{:else}Ошибка{/if}
                </span>
              </div>
            </a>
          {/each}
        </div>
      {/if}
    </section>

    <section class="change-password">
      <h2>Сменить пароль</h2>

      {#if passwordSuccess}
        <p class="success">Пароль успешно изменён</p>
      {:else}
        <form onsubmit={handleChangePassword}>
          {#if passwordError}
            <p class="error">{passwordError}</p>
          {/if}

          <label>
            Текущий пароль
            <input type="password" bind:value={oldPassword} required />
          </label>

          <label>
            Новый пароль
            <input type="password" bind:value={newPassword} required minlength={8} />
          </label>

          <label>
            Подтвердите новый пароль
            <input type="password" bind:value={confirmPassword} required minlength={8} />
          </label>

          <button type="submit" disabled={changingPassword}>
            {changingPassword ? 'Сохранение...' : 'Сменить пароль'}
          </button>
        </form>
      {/if}
    </section>
  </div>
{/if}

<style>
  .profile-page { max-width: 800px; margin: 0 auto; }

  .loading, .empty { color: #718096; text-align: center; padding: 2rem; }
  .error { color: #e53e3e; }

  .profile-header {
    margin-bottom: 2rem;
  }

  .profile-header h1 { margin: 0 0 0.25rem; }
  .email { color: #718096; margin: 0.25rem 0; }
  .created { color: #a0aec0; font-size: 0.85rem; margin: 0; }

  .stats {
    display: flex;
    gap: 2rem;
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .stat-number {
    font-size: 2rem;
    font-weight: 700;
    color: #2d3748;
  }

  .stat-label {
    font-size: 0.85rem;
    color: #718096;
  }

  .my-puzzles {
    margin-bottom: 2rem;
  }

  .my-puzzles h2 { margin-bottom: 1rem; }

  .puzzle-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
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
    height: 140px;
    background-size: cover;
    background-position: center;
    background-color: #edf2f7;
  }

  .card-info { padding: 0.5rem; }
  .card-info h3 { margin: 0 0 0.25rem; font-size: 0.9rem; }

  .badge {
    display: inline-block;
    padding: 0.1rem 0.4rem;
    border-radius: 3px;
    font-size: 0.7rem;
    margin-right: 0.3rem;
  }

  .badge.public { background: #f0fff4; color: #276749; }
  .badge.private { background: #fefcbf; color: #975a16; }

  .status {
    display: inline-block;
    padding: 0.1rem 0.4rem;
    border-radius: 3px;
    font-size: 0.7rem;
  }

  .status-pending { background: #fefcbf; color: #975a16; }
  .status-processing { background: #ebf8ff; color: #2b6cb0; }
  .status-ready { background: #f0fff4; color: #276749; }
  .status-error { background: #fff5f5; color: #c53030; }

  .change-password {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .change-password h2 { margin: 0 0 1rem; }

  .change-password form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .change-password label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.875rem;
    color: #555;
  }

  .change-password input {
    padding: 0.5rem 0.75rem;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 1rem;
  }

  .change-password button {
    padding: 0.75rem;
    background: #4299e1;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
  }

  .change-password button:disabled { opacity: 0.6; cursor: not-allowed; }
  .change-password button:hover:not(:disabled) { background: #3182ce; }

  .success { color: #38a169; font-weight: 500; }

  @media (max-width: 640px) {
    .stats {
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
    }

    .stat-number {
      font-size: 1.5rem;
    }

    .puzzle-grid {
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 0.75rem;
    }

    .card-image {
      height: 100px;
    }
  }
</style>