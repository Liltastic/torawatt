/**
 * Grafikler.
 *
 * Neden kutuphane degil: referans tasarimda uc farkli grafik var ve ucu de
 * cok sade - mini sutunlar, mini cizgi ve alan grafigi. Bir grafik
 * kutuphanesini bu gorunume zorlamak (kendi eksenleri, kendi renkleri, kendi
 * ipuclari) hem daha fazla kod hem daha fazla yuk olurdu. Uc kucuk SVG
 * bileseni tasarimi birebir veriyor ve paket eklemiyor.
 */
import { useId } from 'react';
import type { Point } from '../lib/api';

/** Sifir bolmeden kacinarak degerleri 0-1 araligina tasir. */
function normalise(values: number[]): { min: number; span: number } {
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  return { min, span: max - min || 1 };
}

export function MiniBars({ data, tone = 'accent' }: { data: Point[]; tone?: 'accent' | 'muted' }) {
  if (data.length === 0) return <div className="metric__chart" />;
  const { min, span } = normalise(data.map((d) => d.value));
  const width = 100;
  const gap = 2.5;
  const barWidth = (width - gap * (data.length - 1)) / data.length;
  const colour = tone === 'accent' ? 'var(--accent)' : 'var(--text-tertiary)';

  return (
    <svg className="metric__chart" viewBox="0 0 100 40" preserveAspectRatio="none" role="img">
      {data.map((point, index) => {
        const height = Math.max(2, ((point.value - min) / span) * 34);
        return (
          <rect
            key={point.label + index}
            x={index * (barWidth + gap)}
            y={40 - height}
            width={barWidth}
            height={height}
            rx={1.6}
            fill={colour}
            // Son sutun en taze veri; digerleri geri cekiliyor ki goz
            // bugune odaklansin.
            opacity={index === data.length - 1 ? 1 : 0.34}
          />
        );
      })}
    </svg>
  );
}

export function MiniLine({ data }: { data: Point[] }) {
  const gradientId = useId();
  if (data.length < 2) return <div className="metric__chart" />;

  const { min, span } = normalise(data.map((d) => d.value));
  const step = 100 / (data.length - 1);
  const points = data.map((point, index) => {
    const x = index * step;
    const y = 36 - ((point.value - min) / span) * 30;
    return `${x},${y}`;
  });

  return (
    <svg className="metric__chart" viewBox="0 0 100 40" preserveAspectRatio="none" role="img">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,40 ${points.join(' ')} 100,40`} fill={`url(#${gradientId})`} />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={1.8}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * Buyuk alan grafigi: referanstaki "Activity Tracking" karti.
 *
 * Tepe noktaya bir etiket balonu konuyor - referansta da oyle. Etiket en
 * yuksek degeri gosteriyor, cunku bir yoneticinin ilk aradigi sey zirve.
 */
export function AreaChart({ data, unit }: { data: Point[]; unit: string }) {
  const gradientId = useId();
  if (data.length < 2) {
    return <div className="chart" />;
  }

  const width = 560;
  const height = 168;
  const padding = { top: 18, right: 12, bottom: 22, left: 34 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const values = data.map((d) => d.value);
  const max = Math.max(...values, 1);
  const step = plotWidth / (data.length - 1);

  const coords = data.map((point, index) => ({
    x: padding.left + index * step,
    y: padding.top + plotHeight - (point.value / max) * plotHeight,
    point,
  }));

  // Yumusak cizgi: her noktadan gecen kubik egri. Duz cizgi referanstaki
  // akiskan gorunumu vermiyordu.
  const path = coords
    .map((coord, index) => {
      if (index === 0) return `M ${coord.x} ${coord.y}`;
      const prev = coords[index - 1];
      const cx = (prev.x + coord.x) / 2;
      return `C ${cx} ${prev.y}, ${cx} ${coord.y}, ${coord.x} ${coord.y}`;
    })
    .join(' ');

  const peak = coords.reduce((best, c) => (c.point.value > best.point.value ? c : best), coords[0]);
  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Enerji grafigi">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.32" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {gridLines.map((ratio) => {
        const y = padding.top + plotHeight * ratio;
        return (
          <g key={ratio}>
            <line
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="var(--border)"
              strokeDasharray="3 5"
            />
            <text x={4} y={y + 3} fontSize={9} fill="var(--text-tertiary)">
              {Math.round(max * (1 - ratio))}
            </text>
          </g>
        );
      })}

      <path d={`${path} L ${coords[coords.length - 1].x} ${padding.top + plotHeight} L ${padding.left} ${padding.top + plotHeight} Z`} fill={`url(#${gradientId})`} />
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2.2} strokeLinecap="round" />

      {/*
        Etiketler SEYRELTILIYOR. Otuz gunluk pencerede otuz tarih yan yana
        okunmuyor, ust uste biniyor; yaklasik sekiz etiket birakmak hem
        araligi hem de yonu gosteriyor. Ilk ve son gun her zaman yaziliyor.
      */}
      {coords.map((coord, index) => {
        const every = Math.max(1, Math.ceil(coords.length / 8));
        const last = index === coords.length - 1;
        if (index % every !== 0 && !last) return null;
        // Son etiket her zaman yaziliyor; ona cok yakin duseni atliyoruz,
        // yoksa ikisi ust uste biniyor.
        if (!last && coords.length - 1 - index < every) return null;
        return (
          <text
            key={coord.point.label + coord.x}
            x={coord.x}
            y={height - 6}
            fontSize={9}
            textAnchor={index === 0 ? 'start' : last ? 'end' : 'middle'}
            fill="var(--text-tertiary)">
            {coord.point.label}
          </text>
        );
      })}

      <circle cx={peak.x} cy={peak.y} r={4.5} fill="var(--accent)" stroke="var(--bg)" strokeWidth={2} />
      <g transform={`translate(${Math.min(Math.max(peak.x - 30, 2), width - 78)}, ${Math.max(peak.y - 26, 2)})`}>
        <rect width={72} height={19} rx={9.5} fill="var(--accent)" />
        <text x={36} y={13} fontSize={10} fontWeight={700} textAnchor="middle" fill="#04201c">
          {Math.round(peak.point.value)} {unit}
        </text>
      </g>
    </svg>
  );
}
