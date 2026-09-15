import type { QueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { ApiError, authApi, setAuthToken, setUnauthorizedHandler, type AuthUser } from '@/services/api';

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
  updateProfile: (name: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  /** Hesabi ve tum verilerini kalici olarak siler, ardindan oturumu kapatir. */
  deleteAccount: () => Promise<void>;
}

const TOKEN_KEY = 'tora-watt-auth-token';

/**
 * setAuthToken ile ayni desen: store, QueryClientProvider'in altinda olmadigi
 * icin useQueryClient kullanamiyor; client'i src/app/_layout.tsx bir kez
 * kaydediyor. Oturum degisiminde cache'i bosaltmak icin gerekli - aksi halde
 * onceki hesabin araclari/rezervasyonlari/gecmisi yeni kullaniciya gorunuyor.
 */
let queryClient: QueryClient | undefined;

export function setQueryClientForAuth(client: QueryClient) {
  queryClient = client;
}

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
    } catch (error) {
      // Token'i YALNIZCA sunucu reddettiyse sil. Ag hatasi veya zaman asimi
      // (Render soguk baslangici 30 sn'yi asabiliyor, istekler artik o surede
      // iptal ediliyor) gecerli bir oturumu silmemeli: kapali otoparkta ya da
      // tunelde uygulamayi acan kullanici yoksa oturumunu kaybedip yeniden
      // giris yapmak zorunda kaliyor. Token dururken sadece bu acilisi
      // dogrulayamiyoruz; bir sonraki acilis onu geri yukleyecek.
      if (error instanceof ApiError && error.status === 401) {
        setAuthToken(undefined);
        await SecureStore.deleteItemAsync(TOKEN_KEY);
      }
      set({ status: 'unauthenticated' });
    }
  },

  register: async (email, password, name) => {
    set({ error: undefined });
    try {
      const { token, user } = await authApi.register(email, password, name);
      setAuthToken(token);
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      // set()'ten ONCE: bu anda hicbir (tabs) ekrani mount degil, yani silinen
      // sorgular icin hayalet refetch olmaz. Sonrasina birakilirsa yeni oturumun
      // ilk karesinde onceki hesabin verisi gorunur.
      queryClient?.clear();
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
      // Ayni cihazda hesap degisimi: onceki kullanicinin cache'i yeni oturuma
      // sizmasin (register'daki aciklamanin aynisi, sira onemli).
      queryClient?.clear();
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

  updateProfile: async (name) => {
    const user = await authApi.updateProfile(name);
    set({ user });
  },

  changePassword: async (currentPassword, newPassword) => {
    // Sunucu sifre degisiminde User.tokenVersion'i artirip yerine gecen token'i
    // yanitta donuyor (bkz. server/src/routes/auth.ts); almazsak elimizdeki
    // token aninda gecersizlesir ve kullanici "Şifre güncellendi" yazisini
    // gordukten hemen sonra sessizce disari atilir.
    //
    // Yanit BOS da olabilir: token surumu eklenmemis bir sunucu 204 donuyor.
    // O durumda mevcut token gecerli kalmaya devam ediyor, dokunmuyoruz -
    // boylece uygulama iki sunucu surumuyle de calisiyor.
    const result = await authApi.changePassword(currentPassword, newPassword);
    if (!result?.token) return;

    setAuthToken(result.token);
    await SecureStore.setItemAsync(TOKEN_KEY, result.token);
    set({ token: result.token });
  },

  deleteAccount: async () => {
    await authApi.deleteAccount();
    setAuthToken(undefined);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    set({ token: undefined, user: undefined, status: 'unauthenticated' });
  },
}));

// api.ts, token gecersiz/suresi dolmus 401 aldiginda oturumu otomatik kapatabilsin diye.
setUnauthorizedHandler(() => {
  void useAuthStore.getState().logout();
});
