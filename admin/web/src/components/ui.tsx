/** Tablolarin ve sayfalarin paylastigi kucuk parcalar. */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Skeleton } from '@react-cupertino-ui/skeleton';

import { UnauthorisedError, type ListParams, type Page } from '../lib/api';
import { statusTone } from '../lib/format';
import { useSession } from '../lib/session';
import { IconSearch } from './icons';

export function StatusPill({ status, label }: { status: string; label?: string }) {
  return <span className={`pill pill--${statusTone(status)}`}>{label ?? status}</span>;
}

export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="page__title">{title}</h1>
      <p className="page__sub">{subtitle}</p>
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="searchbox">
      <IconSearch size={16} />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </div>
  );
}

export function TableShell({
  loading,
  error,
  empty,
  children,
}: {
  loading: boolean;
  error?: string;
  empty: boolean;
  children: ReactNode;
}) {
  if (error) return <div className="empty">{error}</div>;
  if (loading) {
    return (
      <div className="table__wrap" style={{ padding: 12 }}>
        {[0, 1, 2, 3, 4, 5].map((row) => (
          <Skeleton key={row} style={{ height: 34, marginBottom: 8, borderRadius: 10 }} />
        ))}
      </div>
    );
  }
  if (empty) return <div className="empty">Kayıt yok.</div>;
  return <div className="table__wrap">{children}</div>;
}

/**
 * Liste sayfalarinin ortak veri akisi.
 *
 * Arama yazarken her tusa istek gitmesin diye 300 ms bekleniyor; beklerken
 * yazmaya devam edilirse onceki istek hic baslamiyor. Oturum biterse
 * (401) tum panel giris ekranina donuyor - her sayfanin bunu ayri ayri
 * ele almasi gerekmesin diye burada yakalaniyor.
 */
export function useList<T>(
  fetcher: (params: ListParams) => Promise<Page<T>>,
  params: ListParams = {},
) {
  const { expire } = useSession();
  const [data, setData] = useState<Page<T>>({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const key = JSON.stringify(params);

  const load = useCallback(async () => {
    setError(undefined);
    try {
      setData(await fetcher(JSON.parse(key) as ListParams));
    } catch (err) {
      if (err instanceof UnauthorisedError) {
        expire();
        return;
      }
      setError(err instanceof Error ? err.message : 'Liste alınamadı');
    } finally {
      setLoading(false);
    }
    // fetcher her cizimde yeni referans olabiliyor; anahtar sorgunun kendisi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, expire]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) void load();
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [load]);

  return { ...data, loading, error, reload: load };
}
