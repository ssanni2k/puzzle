/// <reference types="svelte" />
/// <reference path="compiler.d.ts" />

declare module 'svelte-spa-router' {
  import type { SvelteComponent } from 'svelte';

  interface RouteDefinition {
    component: typeof SvelteComponent;
    conditions?: ((detail: { location: string; params: Record<string, string> }) => boolean)[];
    userData?: unknown;
  }

  export functionRouter(routes: Record<string, RouteDefinition | typeof SvelteComponent>): typeof SvelteComponent;
  export function link(node: HTMLElement, params?: { to: string }): { destroy: () => void };
  export function pop(): void;
  export function push(path: string): void;
  export function replace(path: string): void;
}

declare module '*.svelte' {
  import type { ComponentType } from 'svelte';
  const component: ComponentType;
  export default component;
}