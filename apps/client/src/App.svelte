<script lang="ts">
  import { onMount } from 'svelte';
</script>

<main>
  <h1>Пазлы</h1>
  <p>Приложение загружается...</p>
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    text-align: center;
  }

  h1 {
    color: #333;
  }
</style>