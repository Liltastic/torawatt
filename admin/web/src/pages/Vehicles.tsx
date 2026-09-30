import { useState } from 'react';

import { api } from '../lib/api';
import { formatDecimal, formatNumber } from '../lib/format';
import { PageHeader, SearchInput, StatusPill, TableShell, useList } from '../components/ui';

/**
 * Araclar SALT OKUNUR.
 *
 * Kayit kullanicinin kendi araci; batarya ve guc degerlerini yonetimin
 * degistirmesi, kullanicinin menzil ve sarj suresi hesabini sessizce
 * bozardi. Burada yalnizca gorunuyorlar.
 */
export function Vehicles() {
  const [search, setSearch] = useState('');
  const { items, total, loading, error } = useList(api.vehicles, { search, limit: 100 });

  return (
    <div className="page">
      <PageHeader title="Araçlar" subtitle={`${formatNumber(total)} kayıtlı araç`} />

      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Marka, model veya kullanıcı" />
      </div>

      <TableShell loading={loading} error={error} empty={items.length === 0}>
        <table className="table">
          <thead>
            <tr>
              <th>Araç</th>
              <th className="table__num">Yıl</th>
              <th className="table__num">Batarya</th>
              <th>Sahibi</th>
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
    </div>
  );
}
