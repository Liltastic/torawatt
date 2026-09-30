import { useState } from 'react';

import { api } from '../lib/api';
import {
  formatDateTime,
  formatDecimal,
  formatDuration,
  formatMoney,
  formatNumber,
} from '../lib/format';
import { PageHeader, SearchInput, TableShell, useList } from '../components/ui';

export function Sessions() {
  const [search, setSearch] = useState('');
  const { items, total, loading, error } = useList(api.sessions, { search, limit: 100 });

  // Sayfadaki toplam: listelenen kayitlarin toplami, TUM kayitlarin degil.
  // Basligin bunu soylemesi gerekiyor, yoksa 100 satirin toplami butun
  // cironun kendisi sanilir.
  const energy = items.reduce((sum, item) => sum + item.energyKwh, 0);
  const revenue = items.reduce((sum, item) => sum + item.cost, 0);

  return (
    <div className="page">
      <PageHeader
        title="Şarj oturumları"
        subtitle={`${formatNumber(total)} kayıt · listelenen ${items.length} oturumda ${formatDecimal(
          energy,
        )} kWh / ${formatMoney(revenue)}`}
      />

      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="İstasyon veya kullanıcı" />
      </div>

      <TableShell loading={loading} error={error} empty={items.length === 0}>
        <table className="table">
          <thead>
            <tr>
              <th>Başlangıç</th>
              <th>İstasyon</th>
              <th>Soket</th>
              <th>Kullanıcı</th>
              <th className="table__num">Süre</th>
              <th className="table__num">Enerji</th>
              <th className="table__num">Birim</th>
              <th className="table__num">Tutar</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{formatDateTime(item.startedAt)}</td>
                <td>{item.stationName}</td>
                <td style={{ color: 'var(--text-tertiary)' }}>{item.connectorLabel}</td>
                <td>{item.ownerEmail || '—'}</td>
                <td className="table__num">{formatDuration(item.durationMinutes)}</td>
                <td className="table__num">{formatDecimal(item.energyKwh)} kWh</td>
                <td className="table__num">{formatDecimal(item.pricePerKwh)}</td>
                <td className="table__num" style={{ fontWeight: 600 }}>
                  {formatMoney(item.cost)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
}
