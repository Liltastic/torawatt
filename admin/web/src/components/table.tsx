/**
 * Tablolarin ortak davranislari: siralama, sayfalama ve disa aktarim.
 *
 * Uc isin de tek yerde olmasinin sebebi tutarlilik - her sayfa ayni sekilde
 * siralaniyor, ayni sayfa boyutunu kullaniyor ve disa aktarirken EKRANDAKI
 * suzgeci koruyor.
 */
import { useCallback, useMemo, useState, type ReactNode } from 'react';

import { api, type ListParams } from '../lib/api';
import { formatNumber } from '../lib/format';
import { IconChevronDown, IconChevronLeft, IconChevronRight } from './icons';

export const PAGE_SIZE = 50;

export interface TableState {
  search: string;
  setSearch: (value: string) => void;
  sort?: string;
  dir: 'asc' | 'desc';
  toggleSort: (column: string) => void;
  page: number;
  setPage: (page: number) => void;
  params: ListParams;
}

/**
 * Tablo durumunu tutar.
 *
 * Arama ya da sira degisince sayfa BASA doner: aksi halde kullanici ucuncu
 * sayfadayken arama yaptiginda sonucu olmayan bir sayfada bos ekran goruyor.
 */
export function useTableState(extra: ListParams = {}): TableState {
  const [search, setSearchRaw] = useState('');
  const [sort, setSort] = useState<string>();
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);

  const setSearch = useCallback((value: string) => {
    setSearchRaw(value);
    setPage(0);
  }, []);

  const toggleSort = useCallback(
    (column: string) => {
      if (sort === column) {
        setDir((current) => (current === 'asc' ? 'desc' : 'asc'));
      } else {
        setSort(column);
        setDir('asc');
      }
      setPage(0);
    },
    [sort],
  );

  const extraKey = JSON.stringify(extra);
  const params = useMemo<ListParams>(
    () => ({
      ...(JSON.parse(extraKey) as ListParams),
      search,
      sort,
      dir,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
    [extraKey, search, sort, dir, page],
  );

  return { search, setSearch, sort, dir, toggleSort, page, setPage, params };
}

/** Siralanabilir baslik hucresi. */
export function SortTh({
  column,
  state,
  children,
  numeric,
}: {
  column: string;
  state: TableState;
  children: ReactNode;
  numeric?: boolean;
}) {
  const active = state.sort === column;
  return (
    <th className={numeric ? 'table__num' : undefined}>
      <button
        type="button"
        className={`sortth ${active ? 'sortth--active' : ''}`}
        onClick={() => state.toggleSort(column)}
        style={numeric ? { marginLeft: 'auto' } : undefined}>
        {children}
        <span className={`sortth__arrow ${active && state.dir === 'desc' ? 'sortth__arrow--down' : ''}`}>
          {active ? <IconChevronDown size={11} /> : null}
        </span>
      </button>
    </th>
  );
}

/** Sayfa gezinme cubugu: "51-100 / 902" + ileri/geri. */
export function Pager({ state, total }: { state: TableState; total: number }) {
  const from = total === 0 ? 0 : state.page * PAGE_SIZE + 1;
  const to = Math.min(total, (state.page + 1) * PAGE_SIZE);
  const last = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

  if (total <= PAGE_SIZE) {
    return <div className="pager__info">{formatNumber(total)} kayıt</div>;
  }

  return (
    <div className="pager">
      <span className="pager__info">
        {formatNumber(from)}-{formatNumber(to)} / {formatNumber(total)}
      </span>
      <button
        className="rowbtn"
        type="button"
        disabled={state.page === 0}
        onClick={() => state.setPage(state.page - 1)}
        aria-label="Önceki sayfa">
        <IconChevronLeft size={13} />
      </button>
      <button
        className="rowbtn"
        type="button"
        disabled={state.page >= last}
        onClick={() => state.setPage(state.page + 1)}
        aria-label="Sonraki sayfa">
        <IconChevronRight size={13} />
      </button>
    </div>
  );
}

/**
 * CSV indirme dugmesi.
 *
 * Sayfalama BILEREK disarida: "disa aktar" diyen bir yonetici gorunen 50
 * satiri degil, aramasina uyan butun kayitlari bekler (bkz. backend export.go).
 */
export function ExportButton({ kind, state }: { kind: string; state: TableState }) {
  const href = api.exportUrl(kind, { search: state.search, sort: state.sort, dir: state.dir });
  return (
    <a className="chip" href={href} download>
      Dışa aktar (CSV)
    </a>
  );
}
