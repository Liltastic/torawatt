import { useState } from 'react';

import { api } from '../lib/api';
import {
  RESERVATION_STATUS_LABELS,
  formatDateTime,
  formatDuration,
  formatNumber,
} from '../lib/format';
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
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const { items, total, loading, error, reload } = useList(api.reservations, {
    search,
    status,
    limit: 100,
  });
  const [actionError, setActionError] = useState<string>();

  const change = async (id: string, next: string) => {
    setActionError(undefined);
    try {
      await api.setReservationStatus(id, next);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Durum değiştirilemedi');
    }
  };

  return (
    <div className="page">
      <PageHeader title="Rezervasyonlar" subtitle={`${formatNumber(total)} kayıt`} />

      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="İstasyon veya kullanıcı" />
        {FILTERS.map((value) => (
          <button
            key={value || 'all'}
            className="chip"
            style={
              status === value
                ? { background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'transparent' }
                : undefined
            }
            onClick={() => setStatus(value)}>
            {value ? RESERVATION_STATUS_LABELS[value] : 'Tümü'}
          </button>
        ))}
      </div>

      {actionError && <div className="error">{actionError}</div>}

      <TableShell loading={loading} error={error} empty={items.length === 0}>
        <table className="table">
          <thead>
            <tr>
              <th>Başlangıç</th>
              <th>İstasyon</th>
              <th>Soket</th>
              <th>Kullanıcı</th>
              <th className="table__num">Süre</th>
              <th>Durum</th>
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
    </div>
  );
}
