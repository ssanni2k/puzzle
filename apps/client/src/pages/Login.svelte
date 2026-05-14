<script lang="ts">
  import { auth } from '../stores/auth.js';

  let login = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    error = '';
    loading = true;
    try {
      await auth.login(login, password);
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Login failed';
    } finally {
      loading = false;
    }
  }
</script>

<form onsubmit={handleSubmit}>
  <h2>Вход</h2>

  {#if error}
    <p class="error">{error}</p>
  {/if}

  <label>
    Email или имя пользователя
    <input type="text" bind:value={login} required />
  </label>

  <label>
    Пароль
    <input type="password" bind:value={password} required />
  </label>

  <button type="submit" disabled={loading}>
    {loading ? 'Вход...' : 'Войти'}
  </button>
</form>

<style>
  form {
    max-width: 400px;
    margin: 2rem auto;
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

  input {
    padding: 0.5rem 0.75rem;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 1rem;
  }

  .error {
    color: #e53e3e;
    font-size: 0.875rem;
  }

  button {
    padding: 0.75rem;
    background: #4299e1;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>