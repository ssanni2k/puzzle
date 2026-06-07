<script lang="ts">
  import { auth } from '../stores/auth.js';

  let menuOpen = $state(false);

  async function handleLogout() {
    menuOpen = false;
    await auth.logout();
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  function navigate(path: string) {
    menuOpen = false;
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
</script>

<header>
  <nav>
    <a href="/" class="logo" onclick={() => navigate('/')}>Пазлы</a>

    <button class="hamburger" onclick={() => menuOpen = !menuOpen} aria-label="Меню">
      <span></span>
      <span></span>
      <span></span>
    </button>

    <div class="nav-links" class:open={menuOpen}>
      <a href="/" onclick={() => navigate('/')}>Каталог</a>

      {#if auth.state.isAuthenticated}
        <a href="/create" onclick={() => navigate('/create')}>Создать</a>
        <a href="/profile" class="user-name" onclick={() => navigate('/profile')}>{auth.state.user?.username}</a>
        <button class="logout-btn" onclick={handleLogout}>Выйти</button>
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
    position: sticky;
    top: 0;
    z-index: 1000;
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

  .hamburger {
    display: none;
    flex-direction: column;
    gap: 5px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
  }

  .hamburger span {
    display: block;
    width: 24px;
    height: 2px;
    background: #2d3748;
    border-radius: 1px;
    transition: transform 0.2s, opacity 0.2s;
  }

  .nav-links {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .user-name {
    color: #4a5568;
    font-weight: 500;
    text-decoration: none;
  }

  .user-name:hover { text-decoration: underline; }

  a {
    color: #4299e1;
    text-decoration: none;
    cursor: pointer;
  }

  a:hover { text-decoration: underline; }

  .logout-btn {
    padding: 0.4rem 0.75rem;
    background: transparent;
    color: #e53e3e;
    border: 1px solid #e53e3e;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .logout-btn:hover { background: #e53e3e; color: white; }

  @media (max-width: 640px) {
    .hamburger {
      display: flex;
    }

    .nav-links {
      display: none;
      position: absolute;
      top: 56px;
      left: 0;
      right: 0;
      background: #fff;
      border-bottom: 1px solid #e2e8f0;
      flex-direction: column;
      padding: 1rem 1.5rem;
      gap: 0.75rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
    }

    .nav-links.open {
      display: flex;
    }

    .logout-btn {
      width: 100%;
      text-align: center;
    }
  }
</style>