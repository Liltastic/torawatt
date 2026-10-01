/**
 * Kisa bildirimler.
 *
 * Eylem sonuclari (kaydedildi, silindi, hata) eskiden sayfanin ustunde bir
 * kutuda duruyordu; tablonun dibinde calisan kullanici onu hic gormuyordu.
 * Bildirim ekranin kosesinde beliriyor ve kendi kendine kayboluyor - HATA
 * olanlar haric, onlar okunana kadar duruyor.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type Tone = 'ok' | 'error';

interface Item {
  id: number;
  tone: Tone;
  text: string;
}

interface ToastApi {
  ok: (text: string) => void;
  error: (text: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const VISIBLE_MS = 3200;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (tone: Tone, text: string) => {
      const id = nextId.current++;
      setItems((current) => [...current, { id, tone, text }]);
      if (tone === 'ok') {
        setTimeout(() => dismiss(id), VISIBLE_MS);
      }
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      ok: (text: string) => push('ok', text),
      error: (text: string) => push('error', text),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`toast toast--${item.tone}`}
            onClick={() => dismiss(item.id)}
            title="Kapat">
            {item.text}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast yalnizca ToastProvider icinde kullanilir');
  return value;
}
