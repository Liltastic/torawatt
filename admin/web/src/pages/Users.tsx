import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Drawer, Field, Section } from '../components/Drawer';
import { ExportButton, Pager, SortTh, useTableState } from '../components/table';
import { useToast } from '../components/Toast';
import { PageHeader, SearchInput, StatusPill, TableShell, useList } from '../components/ui';
import { api, type User, type UserDetail } from '../lib/api';
import {
  RESERVATION_STATUS_LABELS,
  formatDate,
  formatDateTime,
  formatDecimal,
  formatMoney,
  formatNumber,
} from '../lib/format';

export function Users() {
  const toast = useToast();
  const state = useTableState();
  const { items, total, loading, error, reload } = useList(api.users, state.params);
  const [detail, setDetail] = useState<UserDetail>();
  const [params, setParams] = useSearchParams();

  const openDetail = useCallback(
    async (id: string) => {
      try {
        setDetail(await api.userDetail(id));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Kullanıcı açılamadı');
      }
    },
    [toast],
  );

  useEffect(() => {
    const wanted = params.get('ac');
    if (!wanted) return;
    void openDetail(wanted);
    setParams({}, { replace: true });
  }, [params, setParams, openDetail]);

  const remove = async (user: User) => {
    // Silme geri alinamaz ve kullanicinin araclari, rezervasyonlari ve sarj
    // gecmisi de gider; onay sormadan yapilmamali.
    if (!window.confirm(`${user.email} ve tüm kayıtları silinsin mi? Bu işlem geri alınamaz.`)) return;
    try {
      await api.deleteUser(user.id);
      toast.ok(`${user.email} silindi`);
      setDetail(undefined);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kullanıcı silinemedi');
    }
  };

  return (
    <div className="page">
      <PageHeader title="Kullanıcılar" subtitle={`${formatNumber(total)} kayıtlı kullanıcı`} />

      <div className="toolbar">
        <SearchInput value={state.search} onChange={state.setSearch} placeholder="Ad veya e-posta ara" />
        <span className="toolbar__spacer" />
        <ExportButton kind="kullanicilar" state={state} />
      </div>

      <TableShell loading={loading} error={error} empty={items.length === 0}>
        <table className="table">
          <thead>
            <tr>
              <SortTh column="name" state={state}>
                Kullanıcı
              </SortTh>
              <SortTh column="email" state={state}>
                E-posta
              </SortTh>
              <SortTh column="vehicles" state={state} numeric>
                Araç
              </SortTh>
              <SortTh column="sessions" state={state} numeric>
                Oturum
              </SortTh>
              <SortTh column="energyKwh" state={state} numeric>
                Enerji
              </SortTh>
              <SortTh column="createdAt" state={state}>
                Kayıt
              </SortTh>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((user) => (
              <tr key={user.id} className="table__row" onClick={() => void openDetail(user.id)}>
                <td style={{ fontWeight: 600 }}>{user.name || '—'}</td>
                <td>{user.email}</td>
                <td className="table__num">{user.vehicles}</td>
                <td className="table__num">{user.sessions}</td>
                <td className="table__num">{formatDecimal(user.energyKwh)} kWh</td>
                <td>{formatDate(user.createdAt)}</td>
                <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                  <button className="rowbtn rowbtn--danger" onClick={() => void remove(user)}>
                    Sil
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>

      <Pager state={state} total={total} />

      <UserDrawer detail={detail} onClose={() => setDetail(undefined)} />
    </div>
  );
}

function UserDrawer({ detail, onClose }: { detail?: UserDetail; onClose: () => void }) {
  if (!detail) return <Drawer open={false} title="" onClose={onClose} children={null} />;
  const { user } = detail;

  return (
    <Drawer open title={user.name || user.email} subtitle={user.email} onClose={onClose}>
      <Section title="Özet">
        <Field label="Kayıt tarihi" value={formatDate(user.createdAt)} />
        <Field label="Şarj oturumu" value={formatNumber(user.sessions)} />
        <Field label="Toplam enerji" value={`${formatDecimal(user.energyKwh)} kWh`} />
        <Field label="Toplam harcama" value={formatMoney(detail.totalSpent)} />
      </Section>

      <Section title={`Araçlar (${detail.vehicles.length})`}>
        {detail.vehicles.length === 0 ? (
          <div className="empty">Kayıtlı araç yok.</div>
        ) : (
          <table className="table">
            <tbody>
              {detail.vehicles.map((vehicle) => (
                <tr key={vehicle.id}>
                  <td style={{ fontWeight: 600 }}>
                    {vehicle.make} {vehicle.model}
                  </td>
                  <td className="table__num">{vehicle.modelYear}</td>
                  <td className="table__num">{formatDecimal(vehicle.batteryCapacityKwh)} kWh</td>
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
        )}
      </Section>

      <Section title="Son rezervasyonlar">
        {detail.reservations.length === 0 ? (
          <div className="empty">Rezervasyon yok.</div>
        ) : (
          <table className="table">
            <tbody>
              {detail.reservations.map((item) => (
                <tr key={item.id}>
                  <td>{formatDateTime(item.startsAt)}</td>
                  <td>{item.stationName}</td>
                  <td>
                    <StatusPill
                      status={item.status}
                      label={RESERVATION_STATUS_LABELS[item.status] ?? item.status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Son şarj oturumları">
        {detail.sessions.length === 0 ? (
          <div className="empty">Şarj kaydı yok.</div>
        ) : (
          <table className="table">
            <tbody>
              {detail.sessions.map((item) => (
                <tr key={item.id}>
                  <td>{formatDateTime(item.startedAt)}</td>
                  <td>{item.stationName}</td>
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
