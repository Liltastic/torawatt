/**
 * Panelin cercevesi: sol simge rayi, orta sutun, sag ray ve alt sekmeler.
 *
 * Yerlesim referans tasarimla ayni oranlarda (bkz. styles/theme.css). Sag ray
 * ve pano AYNI ozet cagrisini paylasiyor: iki ayri istek atmak hem gereksiz
 * hem de iki yerde farkli anlarin sayilarini gosterme riski.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Avatar } from '@react-cupertino-ui/avatar';

import { api, UnauthorisedError, type Overview } from '../lib/api';
import { formatDateTime, formatNumber } from '../lib/format';
import { useSession } from '../lib/session';
import { CommandPalette } from '../components/CommandPalette';
import {
  IconBell,
  IconChart,
  IconBolt,
  IconCalendar,
  IconCar,
  IconChevronLeft,
  IconChevronRight,
  IconCollapse,
  IconGrid,
  IconHistory,
  IconLogout,
  IconMoon,
  IconPlus,
  IconSearch,
  IconStation,
  IconSun,
  IconSupport,
  IconTag,
  IconUsers,
} from '../components/icons';

interface OverviewState {
  data?: Overview;
  days: number;
  setDays: (days: number) => void;
  reload: () => void;
  loading: boolean;
}

const OverviewContext = createContext<OverviewState | null>(null);

export function useOverview(): OverviewState {
  const value = useContext(OverviewContext);
  if (!value) throw new Error('useOverview yalnizca Shell icinde kullanilir');
  return value;
}

const NAV = [
  { to: '/', label: 'Panel', Icon: IconGrid, end: true },
  { to: '/analiz', label: 'Analiz', Icon: IconChart, end: false },
  { to: '/istasyonlar', label: 'İstasyonlar', Icon: IconStation, end: false },
  { to: '/kullanicilar', label: 'Kullanıcılar', Icon: IconUsers, end: false },
  { to: '/rezervasyonlar', label: 'Rezervasyonlar', Icon: IconCalendar, end: false },
  { to: '/oturumlar', label: 'Şarj oturumları', Icon: IconHistory, end: false },
  { to: '/araclar', label: 'Araçlar', Icon: IconCar, end: false },
  { to: '/kampanyalar', label: 'Kampanyalar', Icon: IconTag, end: false },
  { to: '/destek', label: 'Destek', Icon: IconSupport, end: false },
];

export function Shell() {
  const { info, theme, toggleTheme, signOut, expire } = useSession();
  const location = useLocation();
  // Varsayilan 30 gun. Haftalik pencere, gunde birkac oturum alan bir agda
  // cogu zaman bombos cikiyor ve panel bozuk gibi gorunuyor; aylik pencere
  // hem dolu hem de egilimi okunur kiliyor. Ust koseden 7/30/90 arasinda
  // gecilebiliyor.
  const [days, setDays] = useState(30);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Ctrl/Cmd + K her yerden aramayi aciyor; alisilmis kisayol.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const [data, setData] = useState<Overview>();
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    api
      .overview(days)
      .then(setData)
      .catch((err: unknown) => {
        if (err instanceof UnauthorisedError) expire();
      })
      .finally(() => setLoading(false));
  }, [days, expire]);

  useEffect(reload, [reload]);

  const value = useMemo<OverviewState>(
    () => ({ data, days, setDays, reload, loading }),
    [data, days, reload, loading],
  );

  const current = NAV.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to),
  );

  return (
    <OverviewContext.Provider value={value}>
      <div className="app">
        <div className="frame">
          <nav className="rail" aria-label="Bölümler">
            <div className="rail__top">
              <IconCollapse size={18} />
            </div>
            <div className="rail__items">
              {NAV.map(({ to, label, Icon, end }) => (
                <NavLink key={to} to={to} end={end} className="rail__btn" title={label} aria-label={label}>
                  <Icon size={18} />
                </NavLink>
              ))}
            </div>
            <div className="rail__bottom">
              <button className="rail__fab" onClick={toggleTheme} title="Temayı değiştir" aria-label="Temayı değiştir">
                {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
              </button>
              <button
                className="rail__btn"
                onClick={() => void signOut()}
                title="Çıkış yap"
                aria-label="Çıkış yap">
                <IconLogout size={18} />
              </button>
            </div>
          </nav>

          <main className="main">
            <TopBar
              title={current?.label ?? 'Panel'}
              email={info?.email ?? ''}
              onSearch={() => setPaletteOpen(true)}
            />
            <Outlet />
          </main>

          <RightRail />
        </div>

        <Dock demo={info?.demo ?? false} />
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </div>
    </OverviewContext.Provider>
  );
}

/** Ust cubuk: selamlama, arama ve bildirim - referanstaki ile ayni duzen. */
function TopBar({
  title,
  email,
  onSearch,
}: {
  title: string;
  email: string;
  onSearch: () => void;
}) {
  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar';

  return (
    <header className="topbar">
      <div>
        <h1 className="topbar__greeting">
          {greeting}, Yönetici <span aria-hidden="true">👋</span>
        </h1>
        <p className="topbar__sub">
          {title} · {email}
        </p>
      </div>
      <div className="topbar__actions">
        {/*
          Kutu artik gorsel degil: tiklayinca genel aramayi aciyor
          (bkz. CommandPalette). Oncesinde readOnly bir girdiydi ve hicbir sey
          yapmiyordu - panelde en cok yaniltan ayrinti oydu.
        */}
        <button className="searchbox" type="button" onClick={onSearch}>
          <IconSearch size={16} />
          <span className="searchbox__text">İstasyon, kullanıcı, kayıt ara...</span>
          <kbd className="searchbox__kbd">Ctrl K</kbd>
        </button>
        <button className="iconbtn iconbtn--accent" aria-label="Bildirimler">
          <IconBell size={17} />
        </button>
      </div>
    </header>
  );
}

/** Sag ray: profil, sayimlar, takvim ve yaklasan rezervasyonlar. */
function RightRail() {
  const { data } = useOverview();
  const { info } = useSession();
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Uzerinde rezervasyon olan gunler takvimde isaretleniyor.
  const marked = useMemo(() => {
    const days = new Set<string>();
    for (const item of data?.upcoming ?? []) {
      days.add(new Date(item.startsAt).toDateString());
    }
    return days;
  }, [data]);

  return (
    <aside className="rightrail" aria-label="Özet">
      <div className="profile">
        <Avatar size="lg" fallback="TW" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="profile__name">TORA WATT</div>
          <div className="profile__handle">{info?.email ?? 'yönetim'}</div>
        </div>
      </div>

      <div className="vitals">
        <div>
          <b>{formatNumber(data?.counts.stations ?? 0)}</b>
          <span>İstasyon</span>
        </div>
        <div>
          <b>{formatNumber(data?.counts.connectors ?? 0)}</b>
          <span>Soket</span>
        </div>
        <div>
          <b>{formatNumber(data?.counts.users ?? 0)}</b>
          <span>Kullanıcı</span>
        </div>
      </div>

      <Calendar month={month} onMonth={setMonth} marked={marked} />

      <div className="section__head">
        <div className="section__title">Planlanan</div>
        <NavLink to="/rezervasyonlar" className="link">
          tümü
        </NavLink>
      </div>

      <div className="scheduled">
        {(data?.upcoming ?? []).length === 0 && <div className="empty">Yaklaşan rezervasyon yok.</div>}
        {(data?.upcoming ?? []).map((item) => (
          <div className="sched" key={item.id}>
            <div className="sched__thumb">
              <IconBolt size={17} />
            </div>
            <div className="sched__body">
              <div className="sched__kind">Rezervasyon</div>
              <div className="sched__title">{item.stationName}</div>
              <div className="sched__sub">{item.connectorLabel}</div>
            </div>
            <div className="sched__when">{formatDateTime(item.startsAt)}</div>
          </div>
        ))}
      </div>
    </aside>
  );
}

const DOW = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];

function Calendar({
  month,
  onMonth,
  marked,
}: {
  month: Date;
  onMonth: (date: Date) => void;
  marked: Set<string>;
}) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const first = new Date(year, monthIndex, 1);
  // Pazartesi haftanin ilk gunu: getDay() pazari 0 veriyor, kaydiriyoruz.
  const leading = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const today = new Date().toDateString();

  const cells: (Date | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(year, monthIndex, index + 1)),
  ];

  return (
    <div>
      <div className="calendar__head">
        <div className="panel__title">
          {month.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            className="rail__btn"
            style={{ width: 26, height: 26 }}
            onClick={() => onMonth(new Date(year, monthIndex - 1, 1))}
            aria-label="Önceki ay">
            <IconChevronLeft size={14} />
          </button>
          <button
            className="rail__btn"
            style={{ width: 26, height: 26 }}
            onClick={() => onMonth(new Date(year, monthIndex + 1, 1))}
            aria-label="Sonraki ay">
            <IconChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="calendar__grid">
        {DOW.map((day) => (
          <div className="calendar__dow" key={day}>
            {day}
          </div>
        ))}
        {cells.map((date, index) => {
          if (!date) return <div key={`pad-${index}`} />;
          const key = date.toDateString();
          const className = [
            'calendar__day',
            key === today ? 'calendar__day--today' : '',
            key !== today && marked.has(key) ? 'calendar__day--marked' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <button className={className} key={key} type="button">
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Alt sekmeler referanstaki yerinde duruyor. Sagdaki rozet veri kaynagini
 * soyluyor: ornek veriyle bakan biri sayilari gercek sanmasin.
 */
function Dock({ demo }: { demo: boolean }) {
  return (
    <div className="dock">
      <button className="dock__tab dock__tab--active" type="button">
        Panel (Yönetim)
      </button>
      <button className={`dock__tab ${demo ? 'dock__tab--demo' : ''}`} type="button" disabled>
        {demo ? 'Demo veri' : 'Canlı veri'}
      </button>
      <button className="dock__tab" type="button" aria-label="Yeni">
        <IconPlus size={13} />
      </button>
    </div>
  );
}
