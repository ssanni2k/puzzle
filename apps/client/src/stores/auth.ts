import { api } from '../lib/api.js';

interface AuthState {
  isAuthenticated: boolean;
  user: { id: string; username: string; email: string } | null;
  loading: boolean;
}

function createAuthStore() {
  let state = $state<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: true,
  });

  async function checkAuth() {
    try {
      const user = await api.get<{ id: string; username: string; email: string }>('/profile');
      state = { isAuthenticated: true, user, loading: false };
    } catch {
      state = { isAuthenticated: false, user: null, loading: false };
    }
  }

  async function login(login: string, password: string) {
    const user = await api.post<{ id: string; username: string; email: string }>('/auth/login', { login, password });
    state = { isAuthenticated: true, user, loading: false };
    return user;
  }

  async function register(username: string, email: string, password: string) {
    const user = await api.post<{ id: string; username: string; email: string }>('/auth/register', { username, email, password });
    state = { isAuthenticated: true, user, loading: false };
    return user;
  }

  async function logout() {
    await api.post('/auth/logout', {});
    state = { isAuthenticated: false, user: null, loading: false };
  }

  return {
    get state() { return state; },
    checkAuth,
    login,
    register,
    logout,
  };
}

export const auth = createAuthStore();