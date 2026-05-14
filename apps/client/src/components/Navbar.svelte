<script lang="ts">
  import { auth } from '../stores/auth.js';

  async function handleLogout() {
    await auth.logout();
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  function navigate(path: string) {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
</script>

<header>
  <nav>
    <a href="/" class="logo" onclick={() => navigate('/')}>Пазлы</a>

    <div class="nav-links">
      <a href="/" onclick={() => navigate('/')}>Каталог</a>

      {#if auth.state.isAuthenticated}
        <a href="/create" onclick={() => navigate('/create')}>Создать</a>
        <span class="user-name">{auth.state.user?.username}</span>
        <button onclick={handleLogout}>Выйти</button>
      {:else}
        <a href="/login" onclick={() => navigate('/login')}>Вход</a>
        <a href="/register" onclick={() => navigate('/register')}>Регистрация</a>
      {/if}
    </div>
  </nav>
</header>

<style>
  header {
    background: #fff;
    border-bottom: 1px solid #e2e8f0;
    padding: 0 1.5rem;
  }

  nav {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 56px;
  }

  .logo {
    font-size: 1.25rem;
    font-weight: 700;
    color: #2d3748;
    text-decoration: none;
  }

  .nav-links {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .user-name {
    color: #4a5568;
    font-weight: 500;
  }

  a {
    color: #4299e1;
    text-decoration: none;
    cursor: pointer;
  }

  a:hover { text-decoration: underline; }

  button {
    padding: 0.4rem 0.75rem;
    background: transparent;
    color: #e53e3e;
    border: 1px solid #e53e3e;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.875rem;
  }

  button:hover { background: #e53e3e; color: white; }
</style>