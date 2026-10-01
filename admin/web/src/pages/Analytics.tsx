/**
 * Analiz: panonun "ne kadar" sorusunun arkasindaki "nerede, ne zaman, neyle"
 * sorulari.
 *
 * Pano ozet verir; burada kirilimlar var - hangi istasyon, hangi soket tipi,
 * gunun hangi saati. Bir sarj agini buyutmek icin bakilan sayilar bunlar.
 */
import { useEffect, useState } from 'react';

import { AreaChart } from '../components/charts';
import { PageHeader } from '../components/ui';
import { api, UnauthorisedError, type Analytics as Data, type Slice } from '../lib/api';
import { formatCompact, formatDecimal, formatMoney, formatNumber } from '../lib/format';
import { useSession } from '../lib/session';

const PERIODS = [
  { days: 7, label: 'Son 7 gün' },
  { days: 30, label: 'Son 30 gün' },
  { days: 90, label: 'Son 90 gün' },
];

export function Analytics() {
  const { expire } = useSession();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Data>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .analytics(days)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof UnauthorisedError) {
          expire();
          return;
        }
        setError(err instanceof Error ? err.message : 'Analiz alınamadı');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days, expire]);

  const total = data?.byStation.reduce((sum, item) => sum + item.revenue, 0) ?? 0;

  return (
    <div className="page">
      <PageHeader title="Analiz" subtitle="İstasyon, soket ve saat kırılımları" />

      <div className="toolbar">
        {PERIODS.map((period) => (
          <button
            key={period.days}
            className="chip"
            style={
              days === period.days
                ? { background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'transparent' }
                : undefined
            }
            onClick={() => setDays(period.days)}>
            {period.label}
          </button>
        ))}
      </div>

      {error && <div className="error">{error}</div>}
      {loading && !data && <div className="empty">Yükleniyor...</div>}

      {data && (
        <>
          <section className="metrics">
            <Stat label="Oturum başına enerji" value={formatDecimal(data.avgEnergyKwh)} unit="kWh" />
            <Stat label="Oturum başına ciro" value={formatCompact(data.avgRevenue)} unit="TL" />
            <Stat label="Ortalama süre" value={formatDecimal(data.avgDurationMin)} unit="dk" />
            <Stat label="Dönem cirosu" value={formatCompact(total)} unit="TL" />
          </section>

          <div className="card">
            <div className="panel__head">
              <div className="panel__title">Günlük ciro</div>
            </div>
            <AreaChart data={data.revenue} unit="TL" />
          </div>

          <section className="row2">
            <SliceTable title="İstasyona göre" rows={data.byStation} total={total} />
            <SliceTable title="Soket tipine göre" rows={data.byConnector} total={total} />
          </section>

          <div className="card">
            <div className="panel__head">
              <div className="panel__title">Gün içi dağılım</div>
              <span className="page__sub" style={{ margin: 0 }}>
                Oturumların başladığı saat
              </span>
            </div>
            <HourBars rows={data.byHour} />
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <article className="card metric" style={{ minHeight: 0 }}>
      <span className="metric__label">{label}</span>
      <div className="metric__value" style={{ marginTop: 6 }}>
        {value}
        <span className="metric__unit">{unit}</span>
      </div>
    </article>
  );
}

/**
 * Kirilim tablosu. Her satirda payi gosteren bir cubuk var: yuzdeyi okumak
 * yerine goz dogrudan dagilimi goruyor.
 */
function SliceTable({ title, rows, total }: { title: string; rows: Slice[]; total: number }) {
  return (
    <div className="card">
      <div className="panel__head">
        <div className="panel__title">{title}</div>
      </div>
      {rows.length === 0 ? (
        <div className="empty">Bu dönemde kayıt yok.</div>
      ) : (
        <div className="slices">
          {rows.map((row) => (
            <div className="slice" key={row.label}>
              <div className="slice__head">
                <span className="slice__label">{row.label}</span>
                <span className="slice__value">{formatMoney(row.revenue)}</span>
              </div>
              <div className="slice__bar">
                <span
                  className="slice__fill"
                  style={{ width: `${total > 0 ? Math.max(2, (row.revenue / total) * 100) : 0}%` }}
                />
              </div>
              <div className="slice__meta">
                {formatNumber(row.sessions)} oturum · {formatDecimal(row.energyKwh)} kWh
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HourBars({ rows }: { rows: Slice[] }) {
  if (rows.length === 0) return <div className="empty">Bu dönemde kayıt yok.</div>;
  const max = Math.max(...rows.map((row) => row.sessions), 1);

  return (
    <div className="hours">
      {rows.map((row) => (
        <div className="hours__col" key={row.label} title={`${row.label} · ${row.sessions} oturum`}>
          <div className="hours__bar" style={{ height: `${(row.sessions / max) * 100}%` }} />
          <span className="hours__label">{row.label.slice(0, 2)}</span>
        </div>
      ))}
    </div>
  );
}
