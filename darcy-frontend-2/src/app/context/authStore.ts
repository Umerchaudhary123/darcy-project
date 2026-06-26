import { create } from 'zustand';
import { User } from '../../types/index';
import { authApi } from '../../services/index';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (data: { email?: string; username?: string; password: string }) => Promise<{ redirectTo: string }>;
  adminLogin: (data: { email: string; password: string; superAdmin?: boolean }) => Promise<{ redirectTo: string }>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: localStorage.getItem('accessToken'),
  isLoading: false,
  isAuthenticated: !!localStorage.getItem('accessToken'),

  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    set({ accessToken, isAuthenticated: true });
  },

  login: async (data) => {
    set({ isLoading: true });
    try {
      const res = await authApi.login(data);
      const { user, accessToken, refreshToken, redirectTo } = res.data.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      set({ user, accessToken, isAuthenticated: true, isLoading: false });
      return { redirectTo };
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  adminLogin: async (data) => {
    set({ isLoading: true });
    try {
      const res = await authApi.adminLogin(data);
      const { user, accessToken, refreshToken, redirectTo } = res.data.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      set({ user, accessToken, isAuthenticated: true, isLoading: false });
      return { redirectTo };
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch { /* silent */ }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  loadUser: async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) { set({ isLoading: false }); return; }

    set({ isLoading: true });
    try {
      const res = await authApi.me();
      set({ user: res.data.data, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));