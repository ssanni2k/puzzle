<script lang="ts">
  import { onMount } from 'svelte';
  import { auth } from './stores/auth.js';
  import Navbar from './components/Navbar.svelte';
  import Login from './pages/Login.svelte';
  import Register from './pages/Register.svelte';
  import Catalog from './pages/Catalog.svelte';
  import Create from './pages/Create.svelte';
  import PuzzleDetail from './pages/PuzzleDetail.svelte';

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

  function navigate(path: string) {
    window.history.pushState({}, '', path);
    currentRoute = path;
  }

  const routeMatch = $derived(byPattern(currentRoute));

  function byPattern(path: string) {
    if (path === '/login') return { page: 'login', id: '' };
    if (path === '/register') return { page: 'register', id: '' };
    if (path === '/create') return { page: 'create', id: '' };
    if (path === '/' || path === '') return { page: 'catalog', id: '' };

    const puzzleMatch = path.match(/^\/puzzle\/([\w-]+)$/);
    if (puzzleMatch) return { page: 'puzzle', id: puzzleMatch[1] };

    return { page: 'catalog', id: '' };
  }
</script>

<Navbar />

<main>
  {#if routeMatch.page === 'login'}
    <Login />
  {:else if routeMatch.page === 'register'}
    <Register />
  {:else if routeMatch.page === 'create'}
    <Create />
  {:else if routeMatch.page === 'puzzle'}
    <PuzzleDetail />
  {:else}
    <Catalog />
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
</style>