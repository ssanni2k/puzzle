import App from './App.svelte';
import 'svelte-spa-router';

const app = new App({
  target: document.getElementById('app')!,
});

export default app;