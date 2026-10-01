import { api } from '../lib/api';
import { formatDecimal, formatNumber } from '../lib/format';
import { ExportButton, Pager, SortTh, useTableState } from '../components/table';
import { PageHeader, SearchInput, StatusPill, TableShell, useList } from '../components/ui';

/**
 * Araclar SALT OKUNUR.
 *
 * Kayit kullanicinin kendi araci; batarya ve guc degerlerini yonetimin
 * degistirmesi, kullanicinin menzil ve sarj suresi hesabini sessizce
 * bozardi. Burada yalnizca gorunuyorlar.
 */
export function Vehicles() {
  const state = useTableState();
  const { items, total, loading, error } = useList(api.vehicles, state.params);

  return (
    <div className="page">
      <PageHeader title="Araçlar" subtitle={`${formatNumber(total)} kayıtlı araç`} />

      <div className="toolbar">
        <SearchInput
          value={state.search}
          onChange={state.setSearch}
          placeholder="Marka, model veya kullanıcı"
        />
        <span className="toolbar__spacer" />
        <ExportButton kind="araclar" state={state} />
      </div>

      <TableShell loading={loading} error={error} empty={items.length === 0}>
        <table className="table">
          <thead>
            <tr>
              <SortTh column="make" state={state}>
                Araç
              </SortTh>
              <SortTh column="year" state={state} numeric>
                Yıl
              </SortTh>
              <SortTh column="battery" state={state} numeric>
                Batarya
              </SortTh>
              <SortTh column="user" state={state}>
                Sahibi
              </SortTh>
              <th>Durum</th>
            </tr>
          </thead>
          <tbody>
            {items.map((vehicle) => (
              <tr key={vehicle.id}>
                <td style={{ fontWeight: 600 }}>
                  {vehicle.make} {vehicle.model}
                </td>
                <td className="table__num">{vehicle.modelYear}</td>
                <td className="table__num">{formatDecimal(vehicle.batteryCapacityKwh)} kWh</td>
                <td>{vehicle.ownerEmail || '—'}</td>
                <td>
                  {vehicle.isActive ? (
                    <StatusPill status="AVAILABLE" label="Aktif" />
                  ) : (
                    <StatusPill status="UNKNOWN" label="Pasif" />
                  )}
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
