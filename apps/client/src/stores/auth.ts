import { writable } from 'svelte/store';

interface AuthState {
  isAuthenticated: boolean;
  user: { id: string; username: string; email: string } | null;
}

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>({
    isAuthenticated: false,
    user: null,
  });

  return {
    subscribe,
    login(user: AuthState['user']) {
      set({ isAuthenticated: true, user });
    },
    logout() {
      set({ isAuthenticated: false, user: null });
    },
  };
}

export const authStore = createAuthStore();