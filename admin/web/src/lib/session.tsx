/**
 * Oturum durumu ve tema.
 *
 * Bilet HttpOnly cerezde durdugu icin burada saklanan tek sey "girisli miyiz"
 * bilgisi. Acilista /api/session ile dogrulaniyor: sayfa yenilenince yeniden
 * giris istemek yerine cerez hala geciyorsa panel dogrudan aciliyor.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { api, UnauthorisedError, type SessionInfo } from './api';

type Theme = 'dark' | 'light';

interface SessionState {
  status: 'checking' | 'in' | 'out';
  info?: SessionInfo;
  theme: Theme;
  signIn: (info: SessionInfo) => void;
  signOut: () => Promise<void>;
  /** 401 alan her yerden cagrilabilir; paneli giris ekranina dusurur. */
  expire: () => void;
  toggleTheme: () => void;
}

const SessionContext = createContext<SessionState | null>(null);

const THEME_KEY = 'tw-admin-theme';

function readTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    // Gizli sekmede depolama erisimi hata firlatabiliyor; koyu tema varsayilan.
    return 'dark';
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionState['status']>('checking');
  const [info, setInfo] = useState<SessionInfo>();
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Depolama kapali olabilir; tema yine de bu oturumda gecerli.
    }
  }, [theme]);

  useEffect(() => {
    let cancelled = false;
    api
      .session()
      .then((session) => {
        if (cancelled) return;
        setInfo(session);
        setStatus('in');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (!(err instanceof UnauthorisedError)) {
          // Sunucuya hic ulasilamadiysa da giris ekrani dogru yer: orada
          // hata mesaji gosterebiliyoruz.
          console.warn('oturum kontrolu basarisiz', err);
        }
        setStatus('out');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback((next: SessionInfo) => {
    setInfo(next);
    setStatus('in');
  }, []);

  const expire = useCallback(() => {
    setInfo(undefined);
    setStatus('out');
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      expire();
    }
  }, [expire]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo<SessionState>(
    () => ({ status, info, theme, signIn, signOut, expire, toggleTheme }),
    [status, info, theme, signIn, signOut, expire, toggleTheme],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession yalnizca SessionProvider icinde kullanilir');
  return value;
}
