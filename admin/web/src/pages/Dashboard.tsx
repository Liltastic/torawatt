/**
 * Pano - referans tasarimin birebir karsiligi.
 *
 * Yerlesim ayni: dort olcu karti, genis grafik + vurgulu kart, sonra uc kart.
 * Icerik sarj isine cevrildi; bir sarj agini yoneten kisi kalori degil enerji,
 * oturum, ciro ve doluluk goruyor.
 */
import { NavLink } from 'react-router-dom';
import { Skeleton } from '@react-cupertino-ui/skeleton';

import { AreaChart, MiniBars, MiniLine } from '../components/charts';
import { IconBolt, IconChevronDown, IconHistory, IconStation } from '../components/icons';
import type { Metric, StationLoad } from '../lib/api';
import { formatCompact, formatDecimal, formatNumber } from '../lib/format';
import { useOverview } from '../layout/Shell';

const PERIODS = [
  { days: 7, label: 'Haftalık' },
  { days: 30, label: 'Aylık' },
  { days: 90, label: '3 aylık' },
];

export function Dashboard() {
  const { data, days, setDays, loading } = useOverview();

  if (loading && !data) return <DashboardSkeleton />;
  if (!data) return <div className="empty">Özet alınamadı.</div>;

  const period = PERIODS.find((p) => p.days === days) ?? PERIODS[0];
  const spotlight = data.topStations[0];

  return (
    <>
      <section className="metrics">
        <MetricCard
          label="Enerji"
          metric={data.energy}
          value={formatCompact(data.energy.value)}
          unit="kWh"
          chart={<MiniBars data={data.energy.series} />}
        />
        <MetricCard
          label="Şarj oturumu"
          metric={data.sessions}
          value={formatNumber(data.sessions.value)}
          unit="oturum"
          chart={<MiniLine data={data.sessions.series} />}
        />
        <MetricCard
          label="Ciro"
          metric={data.revenue}
          value={formatCompact(data.revenue.value)}
          unit="TL"
          chart={<MiniBars data={data.revenue.series} />}
        />
        <MetricCard
          label="Doluluk"
          metric={data.utilisation}
          value={formatDecimal(data.utilisation.value)}
          unit="%"
          chart={<MiniBars data={data.utilisation.series} tone="muted" />}
        />
      </section>

      <section className="row2">
        <div className="card">
          <div className="panel__head">
            <div className="panel__title">Enerji takibi</div>
            <button
              className="chip"
              type="button"
              onClick={() => {
                const index = PERIODS.findIndex((p) => p.days === days);
                setDays(PERIODS[(index + 1) % PERIODS.length].days);
              }}>
              {period.label}
              <IconChevronDown size={13} />
            </button>
          </div>
          <AreaChart data={data.activity} unit="kWh" />
        </div>

        <div className="spotlight">
          <div>
            <div className="spotlight__label">En yoğun istasyon</div>
            <h2 className="spotlight__name">{spotlight?.name ?? 'Kayıt yok'}</h2>
          </div>
          <div className="spotlight__stats">
            <div className="spotlight__stat">
              <b>{formatCompact(spotlight?.energyKwh ?? 0)}</b>
              <span>kWh · {period.label.toLowerCase()}</span>
            </div>
            <div className="spotlight__stat">
              <b>{formatNumber(spotlight?.sessions ?? 0)}</b>
              <span>oturum</span>
            </div>
            <div className="spotlight__stat">
              <b>
                {spotlight?.available ?? 0}/{spotlight?.total ?? 0}
              </b>
              <span>soket müsait</span>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="section__head">
          <div className="section__title">Öne çıkan istasyonlar</div>
          <NavLink to="/istasyonlar" className="link">
            tümünü gör
          </NavLink>
        </div>
        <div className="highlights" style={{ marginTop: 10 }}>
          {data.topStations.map((station, index) => (
            <HighlightCard key={station.stationId} station={station} rank={index + 1} />
          ))}
          {data.topStations.length === 0 && <div className="empty">Bu dönemde şarj kaydı yok.</div>}
        </div>
      </section>

      <section className="metrics" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        <CountCard label="Kullanıcı" value={data.counts.users} to="/kullanicilar" />
        <CountCard label="Araç" value={data.counts.vehicles} to="/araclar" />
        <CountCard label="Rezervasyon" value={data.counts.reservations} to="/rezervasyonlar" />
        <CountCard label="Destek talebi" value={data.counts.support} to="/destek" />
      </section>
    </>
  );
}

function MetricCard({
  label,
  metric,
  value,
  unit,
  chart,
}: {
  label: string;
  metric: Metric;
  value: string;
  unit: string;
  chart: React.ReactNode;
}) {
  return (
    <article className="card metric">
      <div className="metric__head">
        <span className="metric__label">{label}</span>
        <span className="metric__dot">
          <IconBolt size={12} />
        </span>
      </div>
      {chart}
      <div className="metric__value">
        {value}
        <span className="metric__unit">{unit}</span>
        {/* Onceki donem sifirsa yuzde anlamsiz; rozet o zaman hic cizilmiyor. */}
        {metric.delta !== 0 && (
          <span className={`metric__delta metric__delta--${metric.delta > 0 ? 'up' : 'down'}`}>
            {metric.delta > 0 ? '+' : ''}
            {formatDecimal(metric.delta)}%
          </span>
        )}
      </div>
    </article>
  );
}

function HighlightCard({ station, rank }: { station: StationLoad; rank: number }) {
  // Ortadaki kart referansta vurgu renginde; ayni yeri koruyoruz.
  const accent = rank === 2;
  return (
    <article className={`highlight ${accent ? 'highlight--accent' : ''}`}>
      <div className="highlight__body">
        <div className="highlight__name">{station.name}</div>
        <div className="highlight__sub">
          {formatNumber(station.sessions)} oturum · {formatCompact(station.energyKwh)} kWh
        </div>
        <span className="highlight__tag">
          {station.available}/{station.total} müsait
        </span>
      </div>
      <div className="highlight__thumb">
        <IconStation size={24} />
      </div>
    </article>
  );
}

function CountCard({ label, value, to }: { label: string; value: number; to: string }) {
  return (
    <NavLink to={to} className="card metric" style={{ minHeight: 0 }}>
      <div className="metric__head">
        <span className="metric__label">{label}</span>
        <span className="metric__dot">
          <IconHistory size={12} />
        </span>
      </div>
      <div className="metric__value" style={{ marginTop: 4 }}>
        {formatNumber(value)}
        <span className="metric__unit">kayıt</span>
      </div>
    </NavLink>
  );
}

function DashboardSkeleton() {
  const bar = (height: number) => <Skeleton style={{ height, borderRadius: 18 }} />;
  return (
    <>
      <section className="metrics">
        {[0, 1, 2, 3].map((index) => (
          <div key={index}>{bar(108)}</div>
        ))}
      </section>
      <section className="row2">
        {bar(214)}
        {bar(214)}
      </section>
      <section className="highlights">
        {[0, 1, 2].map((index) => (
          <div key={index}>{bar(88)}</div>
        ))}
      </section>
    </>
  );
}
