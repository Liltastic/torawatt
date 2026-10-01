import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Drawer, Field, Section } from '../components/Drawer';
import { ExportButton, Pager, SortTh, useTableState } from '../components/table';
import { useToast } from '../components/Toast';
import { PageHeader, SearchInput, StatusPill, TableShell, useList } from '../components/ui';
import { IconPlus, IconTrash } from '../components/icons';
import { api, type Connector, type Station, type StationDetail } from '../lib/api';
import {
  CONNECTOR_STATUS_LABELS,
  formatCoord,
  formatDateTime,
  formatDecimal,
  formatMoney,
  formatNumber,
} from '../lib/format';

const CONNECTOR_TYPES = ['CCS2', 'TYPE_2', 'CHADEMO', 'NACS'];
const CONNECTOR_STATUSES = ['AVAILABLE', 'OCCUPIED', 'FAULTED', 'OFFLINE'];

const EMPTY_STATION: Partial<Station> = {
  name: '',
  address: '',
  operator: 'TORA WATT',
  latitude: 41.0082,
  longitude: 28.9784,
  amenities: [],
};

export function Stations() {
  const toast = useToast();
  const state = useTableState();
  const { items, total, loading, error, reload } = useList(api.stations, state.params);

  const [detail, setDetail] = useState<StationDetail>();
  const [editing, setEditing] = useState<Partial<Station>>();
  const [params, setParams] = useSearchParams();

  const openDetail = useCallback(
    async (id: string) => {
      try {
        setDetail(await api.stationDetail(id));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'İstasyon açılamadı');
      }
    },
    [toast],
  );

  // Genel aramadan gelen baglanti: ?ac=<id> dogrudan o istasyonu aciyor.
  useEffect(() => {
    const wanted = params.get('ac');
    if (!wanted) return;
    void openDetail(wanted);
    setParams({}, { replace: true });
  }, [params, setParams, openDetail]);

  const remove = async (station: Station) => {
    if (!window.confirm(`${station.name} ve soketleri silinsin mi? Bu işlem geri alınamaz.`)) return;
    try {
      await api.deleteStation(station.id);
      toast.ok(`${station.name} silindi`);
      setDetail(undefined);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'İstasyon silinemedi');
    }
  };

  return (
    <div className="page">
      <PageHeader title="İstasyonlar" subtitle={`${formatNumber(total)} istasyon`} />

      <div className="toolbar">
        <SearchInput
          value={state.search}
          onChange={state.setSearch}
          placeholder="İstasyon, adres veya işletmeci"
        />
        <span className="toolbar__spacer" />
        <ExportButton kind="istasyonlar" state={state} />
        <button className="chip chip--accent" onClick={() => setEditing({ ...EMPTY_STATION })}>
          <IconPlus size={13} /> Yeni istasyon
        </button>
      </div>

      <TableShell loading={loading} error={error} empty={items.length === 0}>
        <table className="table">
          <thead>
            <tr>
              <SortTh column="name" state={state}>
                İstasyon
              </SortTh>
              <th>Adres</th>
              <SortTh column="operator" state={state}>
                İşletmeci
              </SortTh>
              <th className="table__num">Soket</th>
              <th>Durum</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((station) => {
              const available = station.connectors.filter((c) => c.status === 'AVAILABLE').length;
              return (
                <tr key={station.id} className="table__row" onClick={() => void openDetail(station.id)}>
                  <td style={{ fontWeight: 600 }}>{station.name}</td>
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
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                    <button className="rowbtn" onClick={() => setEditing(station)}>
                      Düzenle
                    </button>
                    <button
                      className="rowbtn rowbtn--danger"
                      style={{ marginLeft: 6 }}
                      onClick={() => void remove(station)}>
                      Sil
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableShell>

      <Pager state={state} total={total} />

      <StationEditor
        draft={editing}
        onClose={() => setEditing(undefined)}
        onSaved={() => {
          setEditing(undefined);
          reload();
        }}
      />

      <StationDrawer
        detail={detail}
        onClose={() => setDetail(undefined)}
        onChanged={() => {
          if (detail) void openDetail(detail.station.id);
          reload();
        }}
      />
    </div>
  );
}

/** Istasyon ekleme/duzenleme formu. */
function StationEditor({
  draft,
  onClose,
  onSaved,
}: {
  draft?: Partial<Station>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<Partial<Station>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (draft) setForm(draft);
  }, [draft]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.saveStation(form);
      toast.ok(form.id ? 'İstasyon güncellendi' : 'İstasyon eklendi');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'İstasyon kaydedilemedi');
    } finally {
      setBusy(false);
    }
  };

  const set = (patch: Partial<Station>) => setForm((current) => ({ ...current, ...patch }));

  return (
    <Drawer
      open={!!draft}
      title={draft?.id ? 'İstasyonu düzenle' : 'Yeni istasyon'}
      subtitle={draft?.id ?? 'Haritada görünecek kayıt'}
      onClose={onClose}>
      <form onSubmit={save} id="station-form">
        <div className="field">
          <label htmlFor="st-name">İstasyon adı</label>
          <input
            id="st-name"
            value={form.name ?? ''}
            onChange={(e) => set({ name: e.target.value })}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="st-address">Adres</label>
          <input id="st-address" value={form.address ?? ''} onChange={(e) => set({ address: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="st-operator">İşletmeci</label>
          <input
            id="st-operator"
            value={form.operator ?? ''}
            onChange={(e) => set({ operator: e.target.value })}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="field">
            <label htmlFor="st-lat">Enlem</label>
            <input
              id="st-lat"
              type="number"
              step="0.0001"
              value={form.latitude ?? 0}
              onChange={(e) => set({ latitude: Number(e.target.value) })}
            />
          </div>
          <div className="field">
            <label htmlFor="st-lng">Boylam</label>
            <input
              id="st-lng"
              type="number"
              step="0.0001"
              value={form.longitude ?? 0}
              onChange={(e) => set({ longitude: Number(e.target.value) })}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="st-amen">Olanaklar (virgülle ayır)</label>
          <input
            id="st-amen"
            value={(form.amenities ?? []).join(', ')}
            onChange={(e) =>
              set({
                amenities: e.target.value
                  .split(',')
                  .map((part) => part.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>
        <p className="page__sub">
          Soketler kaydettikten sonra istasyonun detayından eklenir.
        </p>
      </form>

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button className="btn" type="submit" form="station-form" disabled={busy} style={{ width: 150 }}>
          {busy ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
        <button className="rowbtn" type="button" onClick={onClose}>
          Vazgeç
        </button>
      </div>
    </Drawer>
  );
}

/** Istasyon detayi: sayilar, soket yonetimi ve son oturumlar. */
function StationDrawer({
  detail,
  onClose,
  onChanged,
}: {
  detail?: StationDetail;
  onClose: () => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [adding, setAdding] = useState(false);

  if (!detail) return <Drawer open={false} title="" onClose={onClose} children={null} />;
  const { station } = detail;

  const saveConnector = async (connector: Partial<Connector>) => {
    try {
      await api.saveConnector({ ...connector, stationId: station.id });
      toast.ok('Soket kaydedildi');
      setAdding(false);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Soket kaydedilemedi');
    }
  };

  const removeConnector = async (connector: Connector) => {
    if (!window.confirm(`${connector.type} · ${connector.powerKw} kW soketi silinsin mi?`)) return;
    try {
      await api.deleteConnector(connector.id);
      toast.ok('Soket silindi');
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Soket silinemedi');
    }
  };

  return (
    <Drawer open title={station.name} subtitle={station.address} onClose={onClose}>
      <Section title="Özet">
        <Field label="İşletmeci" value={station.operator} />
        <Field label="Konum" value={`${formatCoord(station.latitude)}, ${formatCoord(station.longitude)}`} />
        <Field label="Toplam enerji" value={`${formatDecimal(detail.energyKwh)} kWh`} />
        <Field label="Toplam ciro" value={formatMoney(detail.revenue)} />
        <Field
          label="Olanaklar"
          value={(station.amenities ?? []).length > 0 ? (station.amenities ?? []).join(', ') : '—'}
        />
      </Section>

      <Section title={`Soketler (${station.connectors.length})`}>
        {station.connectors.map((connector) => (
          <ConnectorRow
            key={connector.id}
            connector={connector}
            onSave={saveConnector}
            onRemove={() => void removeConnector(connector)}
          />
        ))}

        {adding ? (
          <ConnectorRow
            connector={{
              id: '',
              stationId: station.id,
              type: 'CCS2',
              powerKw: 120,
              status: 'AVAILABLE',
              pricePerKwh: 10,
              idleFeePerMin: 2,
            }}
            onSave={saveConnector}
            onRemove={() => setAdding(false)}
            isNew
          />
        ) : (
          <button className="chip" style={{ marginTop: 8 }} onClick={() => setAdding(true)}>
            <IconPlus size={13} /> Soket ekle
          </button>
        )}
      </Section>

      <Section title="Son şarj oturumları">
        {detail.sessions.length === 0 ? (
          <div className="empty">Bu istasyonda henüz şarj yapılmamış.</div>
        ) : (
          <table className="table">
            <tbody>
              {detail.sessions.map((item) => (
                <tr key={item.id}>
                  <td>{formatDateTime(item.startedAt)}</td>
                  <td style={{ color: 'var(--text-tertiary)' }}>{item.ownerEmail || '—'}</td>
                  <td className="table__num">{formatDecimal(item.energyKwh)} kWh</td>
                  <td className="table__num">{formatMoney(item.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </Drawer>
  );
}

/** Tek soket satiri; yerinde duzenlenebiliyor. */
function ConnectorRow({
  connector,
  onSave,
  onRemove,
  isNew,
}: {
  connector: Connector;
  onSave: (connector: Partial<Connector>) => void;
  onRemove: () => void;
  isNew?: boolean;
}) {
  const [form, setForm] = useState(connector);
  const dirty =
    form.type !== connector.type ||
    form.powerKw !== connector.powerKw ||
    form.status !== connector.status ||
    form.pricePerKwh !== connector.pricePerKwh;

  return (
    <div className="connector">
      <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
        {CONNECTOR_TYPES.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>
      <input
        type="number"
        min={1}
        max={400}
        value={form.powerKw}
        onChange={(e) => setForm({ ...form, powerKw: Number(e.target.value) })}
        aria-label="Güç kW"
      />
      <span className="connector__unit">kW</span>
      <input
        type="number"
        step="0.1"
        value={form.pricePerKwh ?? 0}
        onChange={(e) => setForm({ ...form, pricePerKwh: Number(e.target.value) })}
        aria-label="Birim fiyat"
      />
      <span className="connector__unit">TL/kWh</span>
      <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
        {CONNECTOR_STATUSES.map((status) => (
          <option key={status} value={status}>
            {CONNECTOR_STATUS_LABELS[status]}
          </option>
        ))}
      </select>
      <button
        className="rowbtn"
        type="button"
        disabled={!isNew && !dirty}
        onClick={() => onSave(form)}
        title={isNew ? 'Ekle' : 'Kaydet'}>
        {isNew ? 'Ekle' : 'Kaydet'}
      </button>
      <button className="rowbtn rowbtn--danger" type="button" onClick={onRemove} aria-label="Sil">
        <IconTrash size={13} />
      </button>
    </div>
  );
}
