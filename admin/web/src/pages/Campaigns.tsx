import { useState, type FormEvent } from 'react';

import { api, type Campaign } from '../lib/api';
import { formatDate, formatNumber } from '../lib/format';
import { PageHeader, SearchInput, StatusPill, TableShell, useList } from '../components/ui';
import { IconPlus } from '../components/icons';

const EMPTY: Partial<Campaign> = {
  title: '',
  description: '',
  discountLabel: '',
  validUntil: null,
  isActive: true,
};

export function Campaigns() {
  const [search, setSearch] = useState('');
  const { items, total, loading, error, reload } = useList(api.campaigns, { search, limit: 100 });
  const [draft, setDraft] = useState<Partial<Campaign>>();
  const [actionError, setActionError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    setBusy(true);
    setActionError(undefined);
    try {
      await api.saveCampaign(draft);
      setDraft(undefined);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Kampanya kaydedilemedi');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (campaign: Campaign) => {
    if (!window.confirm(`"${campaign.title}" silinsin mi?`)) return;
    setActionError(undefined);
    try {
      await api.deleteCampaign(campaign.id);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Kampanya silinemedi');
    }
  };

  return (
    <div className="page">
      <PageHeader title="Kampanyalar" subtitle={`${formatNumber(total)} kampanya`} />

      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Başlık veya açıklama" />
        <span className="toolbar__spacer" />
        <button className="chip" onClick={() => setDraft({ ...EMPTY })}>
          <IconPlus size={13} /> Yeni kampanya
        </button>
      </div>

      {actionError && <div className="error">{actionError}</div>}

      {draft && (
        <form className="card" onSubmit={save} style={{ display: 'grid', gap: 10 }}>
          <div className="panel__title">{draft.id ? 'Kampanyayı düzenle' : 'Yeni kampanya'}</div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="title">Başlık</label>
            <input
              id="title"
              value={draft.title ?? ''}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              required
            />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="description">Açıklama</label>
            <input
              id="description"
              value={draft.description ?? ''}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="discount">İndirim etiketi</label>
              <input
                id="discount"
                placeholder="%20"
                value={draft.discountLabel ?? ''}
                onChange={(event) => setDraft({ ...draft, discountLabel: event.target.value })}
              />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="until">Geçerlilik (boş = süresiz)</label>
              <input
                id="until"
                type="date"
                value={draft.validUntil ? draft.validUntil.slice(0, 10) : ''}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    // Bos tarih "suresiz" demek; bos metin gonderip sunucuda
                    // sifir tarihe dusmesin diye null'a ceviriyoruz.
                    validUntil: event.target.value
                      ? new Date(`${event.target.value}T23:59:59`).toISOString()
                      : null,
                  })
                }
              />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <input
              type="checkbox"
              checked={draft.isActive ?? true}
              onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })}
            />
            Uygulamada görünsün
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" type="submit" disabled={busy} style={{ width: 140 }}>
              {busy ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            <button className="rowbtn" type="button" onClick={() => setDraft(undefined)}>
              Vazgeç
            </button>
          </div>
        </form>
      )}

      <TableShell loading={loading} error={error} empty={items.length === 0}>
        <table className="table">
          <thead>
            <tr>
              <th>Başlık</th>
              <th>Açıklama</th>
              <th>İndirim</th>
              <th>Geçerlilik</th>
              <th>Durum</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((campaign) => (
              <tr key={campaign.id}>
                <td style={{ fontWeight: 600 }}>{campaign.title}</td>
                <td style={{ color: 'var(--text-tertiary)' }}>{campaign.description}</td>
                <td>{campaign.discountLabel}</td>
                <td>{campaign.validUntil ? formatDate(campaign.validUntil) : 'Süresiz'}</td>
                <td>
                  <StatusPill
                    status={campaign.isActive ? 'AVAILABLE' : 'UNKNOWN'}
                    label={campaign.isActive ? 'Yayında' : 'Kapalı'}
                  />
                </td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button className="rowbtn" onClick={() => setDraft(campaign)}>
                    Düzenle
                  </button>
                  <button
                    className="rowbtn rowbtn--danger"
                    style={{ marginLeft: 6 }}
                    onClick={() => void remove(campaign)}>
                    Sil
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
