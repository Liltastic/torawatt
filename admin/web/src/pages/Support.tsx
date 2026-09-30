import { useState } from 'react';

import { api } from '../lib/api';
import { formatDateTime, formatNumber, formatRelative } from '../lib/format';
import { PageHeader, SearchInput, TableShell, useList } from '../components/ui';

/**
 * Destek talepleri SALT OKUNUR.
 *
 * Kayitta durum ya da yanit alani yok (bkz. server/prisma/schema.prisma
 * SupportRequest). "Cozuldu" isaretlemek icin once semaya alan eklemek
 * gerekir; olmayan bir alani varmis gibi gostermek yerine liste oldugu gibi
 * duruyor.
 */
export function Support() {
  const [search, setSearch] = useState('');
  const { items, total, loading, error } = useList(api.support, { search, limit: 100 });

  return (
    <div className="page">
      <PageHeader title="Destek talepleri" subtitle={`${formatNumber(total)} talep`} />

      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Mesaj veya kullanıcı" />
      </div>

      <TableShell loading={loading} error={error} empty={items.length === 0}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 170 }}>Tarih</th>
              <th style={{ width: 220 }}>Kullanıcı</th>
              <th>Mesaj</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td title={formatDateTime(item.createdAt)}>{formatRelative(item.createdAt)}</td>
                <td>{item.ownerEmail || '—'}</td>
                <td>{item.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
}
