import { useState } from 'react';

import { api, type Connector, type Station } from '../lib/api';
import { CONNECTOR_STATUS_LABELS, formatDecimal, formatNumber } from '../lib/format';
import { PageHeader, SearchInput, StatusPill, TableShell, useList } from '../components/ui';
import { IconChevronDown, IconChevronRight } from '../components/icons';

const STATUS_OPTIONS = ['AVAILABLE', 'OCCUPIED', 'FAULTED', 'OFFLINE'];

export function Stations() {
  const [search, setSearch] = useState('');
  const { items, total, loading, error, reload } = useList(api.stations, { search, limit: 100 });
  const [openId, setOpenId] = useState<string>();
  const [actionError, setActionError] = useState<string>();

  const setStatus = async (connectorId: string, status: string) => {
    setActionError(undefined);
    try {
      await api.setConnectorStatus(connectorId, status);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Soket durumu değiştirilemedi');
    }
  };

  const remove = async (station: Station) => {
    if (!window.confirm(`${station.name} ve soketleri silinsin mi?`)) return;
    setActionError(undefined);
    try {
      await api.deleteStation(station.id);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'İstasyon silinemedi');
    }
  };

  return (
    <div className="page">
      <PageHeader title="İstasyonlar" subtitle={`${formatNumber(total)} istasyon`} />

      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="İstasyon, adres veya işletmeci" />
      </div>

      {actionError && <div className="error">{actionError}</div>}

      <TableShell loading={loading} error={error} empty={items.length === 0}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 34 }} />
              <th>İstasyon</th>
              <th>Adres</th>
              <th>İşletmeci</th>
              <th className="table__num">Soket</th>
              <th>Durum</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((station) => {
              const open = openId === station.id;
              const available = station.connectors.filter((c) => c.status === 'AVAILABLE').length;
              return [
                <tr key={station.id}>
                  <td>
                    <button
                      className="rowbtn"
                      style={{ padding: '0 6px' }}
                      onClick={() => setOpenId(open ? undefined : station.id)}
                      aria-label={open ? 'Soketleri gizle' : 'Soketleri göster'}>
                      {open ? <IconChevronDown size={13} /> : <IconChevronRight size={13} />}
                    </button>
                  </td>
                  <td>{station.name}</td>
                  <td style={{ color: 'var(--text-tertiary)' }}>{station.address}</td>
                  <td>{station.operator}</td>
                  <td className="table__num">
                    {available}/{station.connectors.length}
                  </td>
                  <td>
                    <StatusPill
                      status={available > 0 ? 'AVAILABLE' : 'OCCUPIED'}
                      label={available > 0 ? 'Müsait' : 'Dolu'}
                    />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="rowbtn rowbtn--danger" onClick={() => void remove(station)}>
                      Sil
                    </button>
                  </td>
                </tr>,
                open && (
                  <tr key={`${station.id}-detay`}>
                    <td colSpan={7} style={{ padding: 0 }}>
                      <ConnectorList connectors={station.connectors} onStatus={setStatus} />
                    </td>
                  </tr>
                ),
              ];
            })}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
}

function ConnectorList({
  connectors,
  onStatus,
}: {
  connectors: Connector[];
  onStatus: (id: string, status: string) => void;
}) {
  if (connectors.length === 0) {
    return <div className="empty">Bu istasyonda soket tanımlı değil.</div>;
  }
  return (
    <div style={{ padding: '8px 12px 12px 46px', display: 'grid', gap: 6 }}>
      {connectors.map((connector) => (
        <div
          key={connector.id}
          style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ minWidth: 110, fontWeight: 600 }}>
            {connector.type} · {formatDecimal(connector.powerKw)} kW
          </span>
          <StatusPill
            status={connector.status}
            label={CONNECTOR_STATUS_LABELS[connector.status] ?? connector.status}
          />
          <span style={{ color: 'var(--text-tertiary)', fontSize: 11.5 }}>
            {connector.pricePerKwh != null ? `${formatDecimal(connector.pricePerKwh)} TL/kWh` : 'fiyat yok'}
          </span>
          <span className="toolbar__spacer" />
          {STATUS_OPTIONS.filter((status) => status !== connector.status).map((status) => (
            <button key={status} className="rowbtn" onClick={() => onStatus(connector.id, status)}>
              {CONNECTOR_STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
