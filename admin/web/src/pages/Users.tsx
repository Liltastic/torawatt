import { useState } from 'react';

import { api } from '../lib/api';
import { formatDate, formatDecimal, formatNumber } from '../lib/format';
import { PageHeader, SearchInput, TableShell, useList } from '../components/ui';

export function Users() {
  const [search, setSearch] = useState('');
  const { items, total, loading, error, reload } = useList(api.users, { search, limit: 100 });
  const [busyId, setBusyId] = useState<string>();
  const [actionError, setActionError] = useState<string>();

  const remove = async (id: string, email: string) => {
    // Silme geri alinamaz ve kullanicinin araclari, rezervasyonlari ve sarj
    // gecmisi de gider; onay sormadan yapilmamali.
    if (!window.confirm(`${email} ve tüm kayıtları silinsin mi? Bu işlem geri alınamaz.`)) return;
    setBusyId(id);
    setActionError(undefined);
    try {
      await api.deleteUser(id);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Kullanıcı silinemedi');
    } finally {
      setBusyId(undefined);
    }
  };

  return (
    <div className="page">
      <PageHeader title="Kullanıcılar" subtitle={`${formatNumber(total)} kayıtlı kullanıcı`} />

      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Ad veya e-posta ara" />
      </div>

      {actionError && <div className="error">{actionError}</div>}

      <TableShell loading={loading} error={error} empty={items.length === 0}>
        <table className="table">
          <thead>
            <tr>
              <th>Kullanıcı</th>
              <th>E-posta</th>
              <th className="table__num">Araç</th>
              <th className="table__num">Oturum</th>
              <th className="table__num">Enerji</th>
              <th>Kayıt</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((user) => (
              <tr key={user.id}>
                <td>{user.name || '—'}</td>
                <td>{user.email}</td>
                <td className="table__num">{user.vehicles}</td>
                <td className="table__num">{user.sessions}</td>
                <td className="table__num">{formatDecimal(user.energyKwh)} kWh</td>
                <td>{formatDate(user.createdAt)}</td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    className="rowbtn rowbtn--danger"
                    disabled={busyId === user.id}
                    onClick={() => void remove(user.id, user.email)}>
                    {busyId === user.id ? '...' : 'Sil'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
}
