<script lang="ts">
  import { auth } from '../stores/auth.js';
  import { api } from '../lib/api.js';

  let title = $state('');
  let gridCols = $state(4);
  let gridRows = $state(4);
  let file = $state<File | null>(null);
  let error = $state('');
  let loading = $state(false);
  let success = $state(false);

  function onFileChange(e: Event) {
    const target = e.target as HTMLInputElement;
    file = target.files?.[0] ?? null;
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!file) {
      error = 'Выберите изображение';
      return;
    }

    error = '';
    loading = true;

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('gridCols', String(gridCols));
      formData.append('gridRows', String(gridRows));
      formData.append('file', file);

      await api.upload('/puzzles', formData);
      success = true;
      title = '';
      gridCols = 4;
      gridRows = 4;
      file = null;
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Upload failed';
    } finally {
      loading = false;
    }
  }
</script>

<div class="create-page">
  <h1>Создать пазл</h1>

  {#if !auth.state.isAuthenticated}
    <p class="notice">Для создания пазла необходимо <a href="/login">войти</a> в систему.</p>
  {:else if success}
    <div class="success">
      <p>Пазл создан и отправлен на обработку!</p>
      <button onclick={() => { success = false; }}>Создать ещё</button>
    </div>
  {:else}
    <form onsubmit={handleSubmit}>
      {#if error}
        <p class="error">{error}</p>
      {/if}

      <label>
        Название
        <input type="text" bind:value={title} required maxlength={200} />
      </label>

      <div class="grid-size">
        <label>
          Колонки
          <input type="number" bind:value={gridCols} min={3} max={10} required />
        </label>
        <label>
          Строки
          <input type="number" bind:value={gridRows} min={3} max={10} required />
        </label>
      </div>

      <label>
        Изображение (JPG/PNG, до 10 МБ)
        <input type="file" accept="image/jpeg,image/png" onchange={onFileChange} required />
      </label>

      <button type="submit" disabled={loading}>
        {loading ? 'Создание...' : 'Создать пазл'}
      </button>
    </form>
  {/if}
</div>

<style>
  .create-page { max-width: 500px; margin: 0 auto; }
  h1 { margin-bottom: 1.5rem; }

  .notice { color: #718096; }
  .notice a { color: #4299e1; }

  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.875rem;
    color: #555;
  }

  input[type="text"],
  input[type="number"],
  input[type="file"] {
    padding: 0.5rem 0.75rem;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 1rem;
  }

  .grid-size {
    display: flex;
    gap: 1rem;
  }

  .grid-size label { flex: 1; }

  button {
    padding: 0.75rem;
    background: #4299e1;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
  }

  button:disabled { opacity: 0.6; cursor: not-allowed; }
  button:hover:not(:disabled) { background: #3182ce; }

  .error { color: #e53e3e; font-size: 0.875rem; }

  .success {
    text-align: center;
    padding: 2rem;
    background: #f0fff4;
    border: 1px solid #c6f6d5;
    border-radius: 8px;
  }
</style>