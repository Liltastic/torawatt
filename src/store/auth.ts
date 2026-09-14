import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { authApi, setAuthToken, setUnauthorizedHandler, type AuthUser } from '@/services/api';

export type AuthStatus = 'hydrating' | 'authenticated' | 'unauthenticated';

interface AuthState {
  token?: string;
  user?: AuthUser;
  status: AuthStatus;
  error?: string;
  /** Acilista SecureStore'daki token'i okur; token varsa oturumu geri kurar. */
  hydrate: () => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const TOKEN_KEY = 'tora-watt-auth-token';

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Bir şeyler ters gitti.';
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'hydrating',

  hydrate: async () => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) {
      set({ status: 'unauthenticated' });
      return;
    }

    setAuthToken(token);
    try {
      const user = await authApi.me();
      set({ token, user, status: 'authenticated' });
    } catch {
      // Token gecersiz/suresi dolmus - sessizce temizle, tekrar giris istensin.
      setAuthToken(undefined);
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      set({ status: 'unauthenticated' });
    }
  },

  register: async (email, password, name) => {
    set({ error: undefined });
    try {
      const { token, user } = await authApi.register(email, password, name);
      setAuthToken(token);
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      set({ token, user, status: 'authenticated' });
    } catch (error) {
      set({ error: messageOf(error) });
      throw error;
    }
  },

  login: async (email, password) => {
    set({ error: undefined });
    try {
      const { token, user } = await authApi.login(email, password);
      setAuthToken(token);
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      set({ token, user, status: 'authenticated' });
    } catch (error) {
      set({ error: messageOf(error) });
      throw error;
    }
  },

  logout: async () => {
    setAuthToken(undefined);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    set({ token: undefined, user: undefined, status: 'unauthenticated' });
  },
}));

// api.ts, token gecersiz/suresi dolmus 401 aldiginda oturumu otomatik kapatabilsin diye.
setUnauthorizedHandler(() => {
  void useAuthStore.getState().logout();
});
