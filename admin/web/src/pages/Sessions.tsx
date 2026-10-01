import { api } from '../lib/api';
import {
  formatDateTime,
  formatDecimal,
  formatDuration,
  formatMoney,
  formatNumber,
} from '../lib/format';
import { ExportButton, Pager, SortTh, useTableState } from '../components/table';
import { PageHeader, SearchInput, TableShell, useList } from '../components/ui';

export function Sessions() {
  const state = useTableState();
  const { items, total, loading, error } = useList(api.sessions, state.params);

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
        <SearchInput
          value={state.search}
          onChange={state.setSearch}
          placeholder="İstasyon veya kullanıcı"
        />
        <span className="toolbar__spacer" />
        <ExportButton kind="oturumlar" state={state} />
      </div>

      <TableShell loading={loading} error={error} empty={items.length === 0}>
        <table className="table">
          <thead>
            <tr>
              <SortTh column="startedAt" state={state}>
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
              <SortTh column="energyKwh" state={state} numeric>
                Enerji
              </SortTh>
              <th className="table__num">Birim</th>
              <SortTh column="cost" state={state} numeric>
                Tutar
              </SortTh>
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

      <Pager state={state} total={total} />
    </div>
  );
}
