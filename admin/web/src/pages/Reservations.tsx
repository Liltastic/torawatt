import { useState } from 'react';

import { api } from '../lib/api';
import {
  RESERVATION_STATUS_LABELS,
  formatDateTime,
  formatDuration,
  formatNumber,
} from '../lib/format';
import { ExportButton, Pager, SortTh, useTableState } from '../components/table';
import { useToast } from '../components/Toast';
import { PageHeader, SearchInput, StatusPill, TableShell, useList } from '../components/ui';

const FILTERS = ['', 'PENDING', 'CONFIRMED', 'ARRIVED', 'COMPLETED', 'CANCELLED', 'EXPIRED'];

/** Bir rezervasyon hangi duruma cevrilebilir. Bitmis kayit geri acilmiyor. */
const NEXT: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['ARRIVED', 'CANCELLED'],
  ARRIVED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  EXPIRED: [],
};

export function Reservations() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const state = useTableState({ status });
  const { items, total, loading, error, reload } = useList(api.reservations, state.params);

  const change = async (id: string, next: string) => {
    try {
      await api.setReservationStatus(id, next);
      toast.ok(`Durum "${RESERVATION_STATUS_LABELS[next]}" olarak güncellendi`);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Durum değiştirilemedi');
    }
  };

  return (
    <div className="page">
      <PageHeader title="Rezervasyonlar" subtitle={`${formatNumber(total)} kayıt`} />

      <div className="toolbar">
        <SearchInput
          value={state.search}
          onChange={state.setSearch}
          placeholder="İstasyon veya kullanıcı"
        />
        <span className="toolbar__spacer" />
        <ExportButton kind="rezervasyonlar" state={state} />
      </div>

      <div className="toolbar">
        {FILTERS.map((value) => (
          <button
            key={value || 'all'}
            className="chip"
            style={
              status === value
                ? { background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'transparent' }
                : undefined
            }
            onClick={() => {
              setStatus(value);
              state.setPage(0);
            }}>
            {value ? RESERVATION_STATUS_LABELS[value] : 'Tümü'}
          </button>
        ))}
      </div>

      <TableShell loading={loading} error={error} empty={items.length === 0}>
        <table className="table">
          <thead>
            <tr>
              <SortTh column="startsAt" state={state}>
                Başlangıç
              </SortTh>
              <SortTh column="station" state={state}>
                İstasyon
              </SortTh>
              <th>Soket</th>
              <SortTh column="user" state={state}>
                Kullanıcı
              </SortTh>
              <SortTh column="duration" state={state} numeric>
                Süre
              </SortTh>
              <SortTh column="status" state={state}>
                Durum
              </SortTh>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{formatDateTime(item.startsAt)}</td>
                <td>{item.stationName}</td>
                <td style={{ color: 'var(--text-tertiary)' }}>{item.connectorLabel}</td>
                <td>{item.ownerEmail || '—'}</td>
                <td className="table__num">{formatDuration(item.durationMinutes)}</td>
                <td>
                  <StatusPill
                    status={item.status}
                    label={RESERVATION_STATUS_LABELS[item.status] ?? item.status}
                  />
                </td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {(NEXT[item.status] ?? []).map((next) => (
                    <button
                      key={next}
                      className={`rowbtn ${next === 'CANCELLED' ? 'rowbtn--danger' : ''}`}
                      style={{ marginLeft: 6 }}
                      onClick={() => void change(item.id, next)}>
                      {RESERVATION_STATUS_LABELS[next]}
                    </button>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>

      <Pager state={state} total={total} />
    </div>
  );
}
