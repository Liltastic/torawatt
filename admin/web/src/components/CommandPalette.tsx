/**
 * Genel arama (Ctrl/Cmd + K).
 *
 * Ust cubuktaki arama kutusu bunu aciyor. Tek kutudan hem istasyon hem
 * kullanici araniyor, hem de bolumlere atlaniyor: yoneticinin aradigi seyin
 * hangi sayfada oldugunu onceden bilmesi gerekmiyor.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { api, UnauthorisedError } from '../lib/api';
import { useSession } from '../lib/session';
import { IconSearch, IconStation, IconUsers } from './icons';

interface Hit {
  kind: 'bolum' | 'istasyon' | 'kullanici';
  label: string;
  hint: string;
  to: string;
}

const SECTIONS: Hit[] = [
  { kind: 'bolum', label: 'Panel', hint: 'Genel bakış', to: '/' },
  { kind: 'bolum', label: 'Analiz', hint: 'Kırılımlar', to: '/analiz' },
  { kind: 'bolum', label: 'İstasyonlar', hint: 'Soket yönetimi', to: '/istasyonlar' },
  { kind: 'bolum', label: 'Kullanıcılar', hint: 'Hesaplar', to: '/kullanicilar' },
  { kind: 'bolum', label: 'Rezervasyonlar', hint: 'Durum yönetimi', to: '/rezervasyonlar' },
  { kind: 'bolum', label: 'Şarj oturumları', hint: 'Geçmiş', to: '/oturumlar' },
  { kind: 'bolum', label: 'Araçlar', hint: 'Kayıtlı araçlar', to: '/araclar' },
  { kind: 'bolum', label: 'Kampanyalar', hint: 'Düzenle', to: '/kampanyalar' },
  { kind: 'bolum', label: 'Destek', hint: 'Talepler', to: '/destek' },
];

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { expire } = useSession();
  const [query, setQuery] = useState('');
  const [remote, setRemote] = useState<Hit[]>([]);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setRemote([]);
      setCursor(0);
      // Panel acilir acilmaz yazmaya baslanabilmeli.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Kayitlarda arama: iki harften kisa sorgu icin agi mesgul etmiyoruz.
  useEffect(() => {
    const needle = query.trim();
    if (!open || needle.length < 2) {
      setRemote([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const [stations, users] = await Promise.all([
          api.stations({ search: needle, limit: 5 }),
          api.users({ search: needle, limit: 5 }),
        ]);
        if (cancelled) return;
        setRemote([
          ...stations.items.map<Hit>((item) => ({
            kind: 'istasyon',
            label: item.name,
            hint: item.address,
            to: `/istasyonlar?ac=${encodeURIComponent(item.id)}`,
          })),
          ...users.items.map<Hit>((item) => ({
            kind: 'kullanici',
            label: item.name || item.email,
            hint: item.email,
            to: `/kullanicilar?ac=${encodeURIComponent(item.id)}`,
          })),
        ]);
      } catch (err) {
        if (err instanceof UnauthorisedError) expire();
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open, expire]);

  const hits = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('tr');
    const sections = needle
      ? SECTIONS.filter((item) => item.label.toLocaleLowerCase('tr').includes(needle))
      : SECTIONS;
    return [...sections, ...remote];
  }, [query, remote]);

  useEffect(() => {
    if (cursor >= hits.length) setCursor(0);
  }, [hits.length, cursor]);

  if (!open) return null;

  const go = (hit: Hit) => {
    navigate(hit.to);
    onClose();
  };

  return (
    <div className="palette" role="dialog" aria-modal="true" aria-label="Arama">
      <button className="palette__scrim" onClick={onClose} aria-label="Kapat" type="button" />
      <div className="palette__box">
        <div className="palette__input">
          <IconSearch size={16} />
          <input
            ref={inputRef}
            value={query}
            placeholder="İstasyon, kullanıcı veya bölüm ara..."
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') onClose();
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setCursor((c) => Math.min(c + 1, hits.length - 1));
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                setCursor((c) => Math.max(c - 1, 0));
              }
              if (event.key === 'Enter' && hits[cursor]) go(hits[cursor]);
            }}
          />
          <kbd className="palette__kbd">Esc</kbd>
        </div>

        <div className="palette__list">
          {hits.length === 0 && <div className="empty">Eşleşen kayıt yok.</div>}
          {hits.map((hit, index) => (
            <button
              key={`${hit.kind}-${hit.to}-${hit.label}`}
              type="button"
              className={`palette__hit ${index === cursor ? 'palette__hit--active' : ''}`}
              onMouseEnter={() => setCursor(index)}
              onClick={() => go(hit)}>
              <span className="palette__icon">
                {hit.kind === 'istasyon' ? (
                  <IconStation size={15} />
                ) : hit.kind === 'kullanici' ? (
                  <IconUsers size={15} />
                ) : (
                  <IconSearch size={15} />
                )}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="palette__label">{hit.label}</span>
                <span className="palette__hint">{hit.hint}</span>
              </span>
              <span className="palette__kind">{hit.kind}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
