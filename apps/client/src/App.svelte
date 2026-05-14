<script lang="ts">
  import { onMount } from 'svelte';
  import { auth } from './stores/auth.js';
  import Navbar from './components/Navbar.svelte';
  import Login from './pages/Login.svelte';
  import Register from './pages/Register.svelte';

  let currentRoute = $state('/');

  onMount(() => {
    auth.checkAuth();

    const handlePopState = () => {
      currentRoute = window.location.pathname || '/';
    };

    window.addEventListener('popstate', handlePopState);
    currentRoute = window.location.pathname || '/';
    return () => window.removeEventListener('popstate', handlePopState);
  });
</script>

<Navbar />

<main>
  {#if currentRoute === '/login'}
    <Login />
  {:else if currentRoute === '/register'}
    <Register />
  {:else}
    <div class="home">
      <h1>Пазлы</h1>
      <p>Собирайте пазлы онлайн — каталог скоро появится.</p>
    </div>
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #f7fafc;
    color: #2d3748;
  }

  main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
  }

  .home {
    text-align: center;
    padding: 4rem 0;
  }

  .home h1 {
    font-size: 2.5rem;
    margin-bottom: 1rem;
  }

  .home p {
    color: #718096;
  }
</style>