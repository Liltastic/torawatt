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
 * Son bilinen kullanici. Acilista sunucuya sormadan oturumu hemen kurmak icin:
 * API uykudaysa (Render ucretsiz katmani) /auth/me 30-90 sn surebiliyor ve
 * onceki davranista uygulama o sure boyunca spinner gosterip sonunda kullaniciyi
 * karsilama ekranina atiyordu - "giris yapamiyorum" sikayetinin kaynagi buydu.
 */
const USER_KEY = 'tora-watt-auth-user';

async function persistSession(token: string, user: AuthUser) {
  await Promise.all([
    SecureStore.setItemAsync(TOKEN_KEY, token),
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)),
  ]);
}

async function clearPersistedSession() {
  setAuthToken(undefined);
  await Promise.all([SecureStore.deleteItemAsync(TOKEN_KEY), SecureStore.deleteItemAsync(USER_KEY)]);
}

function parseCachedUser(raw: string | null): AuthUser | undefined {
  if (!raw) return undefined;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as AuthUser).id === 'string' &&
      typeof (value as AuthUser).email === 'string'
    ) {
      return value as AuthUser;
    }
  } catch {
    // Bozuk kayit: sunucudan yeniden alinir.
  }
  return undefined;
}

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
    const [token, cachedUserRaw] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      SecureStore.getItemAsync(USER_KEY),
    ]);
    if (!token) {
      set({ status: 'unauthenticated' });
      return;
    }

    setAuthToken(token);

    const cachedUser = parseCachedUser(cachedUserRaw);
    if (cachedUser) {
      // Oturumu hemen kur, sunucuyla dogrulamayi arka planda yap. Sunucu
      // token'i reddederse (401) api.ts onUnauthorized -> logout ile oturumu
      // kapatir; ag hatasi / zaman asimi / 5xx ise onbellekteki oturum kalir.
      set({ token, user: cachedUser, status: 'authenticated' });
      try {
        const user = await authApi.me();
        // Bu arada cikis yapildiysa (token degisti) eski kullaniciyi geri yazma.
        if (useAuthStore.getState().token !== token) return;
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
        set({ user });
      } catch {
        // 401 zaten onUnauthorized ile ele alindi; gerisi gecici, oturum korunur.
      }
      return;
    }

    // Onbellekte kullanici yok (bu surumden onceki bir giris): dogrulamayi
    // beklemek zorundayiz, sonrasinda kullanici onbellege girer ve bir daha
    // beklenmez.
    try {
      const user = await authApi.me();
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
      set({ token, user, status: 'authenticated' });
    } catch (error) {
      // Token'i YALNIZCA sunucu reddettiyse sil. Ag hatasi veya zaman asimi
      // gecerli bir oturumu silmemeli: kapali otoparkta ya da tunelde
      // uygulamayi acan kullanici yoksa oturumunu kaybedip yeniden giris
      // yapmak zorunda kaliyor. Token dururken sadece bu acilisi
      // dogrulayamiyoruz; bir sonraki acilis onu geri yukleyecek.
      if (error instanceof ApiError && error.status === 401) {
        await clearPersistedSession();
      }
      set({ status: 'unauthenticated' });
    }
  },

  register: async (email, password, name) => {
    set({ error: undefined });
    try {
      const { token, user } = await authApi.register(email, password, name);
      setAuthToken(token);
      await persistSession(token, user);
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
      await persistSession(token, user);
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
    await clearPersistedSession();
    set({ token: undefined, user: undefined, status: 'unauthenticated' });
  },

  updateProfile: async (name) => {
    const user = await authApi.updateProfile(name);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
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
    await clearPersistedSession();
    set({ token: undefined, user: undefined, status: 'unauthenticated' });
  },
}));

// api.ts, token gecersiz/suresi dolmus 401 aldiginda oturumu otomatik kapatabilsin diye.
setUnauthorizedHandler(() => {
  void useAuthStore.getState().logout();
});
