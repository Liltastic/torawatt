import { useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { createThemedStyles, spacing, typography, useColors } from '@/theme';

interface PowerCurveProps {
  /** Ornek sirasiyla kW degerleri. */
  values: number[];
  /** Oturumun tepe gucu; kesikli referans cizgisi olarak cizilir. */
  ratedKw: number;
  height?: number;
}

const PAD_TOP = 18;
const PAD_BOTTOM = 6;
/** Uctaki nokta isaretcisi kenarda yarisi kesilmesin. */
const PAD_X = 10;

/**
 * Anlik guc egrisi: yumusak cizgi, altinda turkuazdan saydama inen dolgu ve
 * tepe gucu gosteren kesikli bir referans.
 *
 * Egri her ornek ciftini, kontrol noktalari iki ucun yataydaki orta noktasinda
 * olan bir kubik bezier ile birlestiriyor: dikeyde hicbir zaman asma yapmaz,
 * yani grafik gercekte olmayan bir tepe ya da cukur uydurmaz.
 *
 * Genislik bir kez onLayout ile olculuyor; ornek sayisi kucuk (en fazla 40),
 * SVG yolu her tikta yeniden uretilse de maliyeti ihmal edilebilir.
 */
export function PowerCurve({ values, ratedKw, height = 132 }: PowerCurveProps) {
  const colors = useColors();
  const styles = useStyles();
  const [width, setWidth] = useState(0);

  const samples = values.filter((v) => v > 0);
  const max = Math.max(ratedKw, ...samples, 1) * 1.08;
  const plotHeight = height - PAD_TOP - PAD_BOTTOM;
  const y = (kw: number) => PAD_TOP + plotHeight * (1 - kw / max);
  const ratedY = y(ratedKw);

  let linePath = '';
  let areaPath = '';
  let last: { x: number; y: number } | undefined;

  if (width > 0 && samples.length >= 2) {
    const step = (width - PAD_X * 2) / (samples.length - 1);
    const points = samples.map((kw, i) => ({ x: PAD_X + i * step, y: y(kw) }));
    linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const midX = (p0.x + p1.x) / 2;
      linePath += ` C ${midX} ${p0.y} ${midX} ${p1.y} ${p1.x} ${p1.y}`;
    }
    last = points[points.length - 1];
    areaPath = `${linePath} L ${last.x} ${height} L ${points[0].x} ${height} Z`;
  }

  return (
    <View
      style={{ height }}
      onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}
      accessibilityRole="image"
      accessibilityLabel="Anlık güç grafiği">
      {width > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.primary} stopOpacity={0.3} />
              <Stop offset="1" stopColor={colors.primary} stopOpacity={0} />
            </LinearGradient>
            <LinearGradient id="curveLine" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={colors.primary} />
              <Stop offset="1" stopColor={colors.success} />
            </LinearGradient>
          </Defs>

          {/* Taban cizgisi */}
          <Line
            x1={0}
            y1={height - 0.5}
            x2={width}
            y2={height - 0.5}
            stroke={colors.border}
            strokeWidth={1}
          />
          {/* Tepe guc referansi */}
          <Line
            x1={PAD_X}
            y1={ratedY}
            x2={width - PAD_X}
            y2={ratedY}
            stroke={colors.textTertiary}
            strokeWidth={1}
            strokeDasharray="4 5"
          />

          {areaPath !== '' && <Path d={areaPath} fill="url(#curveFill)" />}
          {linePath !== '' && (
            <Path
              d={linePath}
              stroke="url(#curveLine)"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          )}
          {last && (
            <>
              <Circle cx={last.x} cy={last.y} r={9} fill={colors.success} fillOpacity={0.18} />
              <Circle
                cx={last.x}
                cy={last.y}
                r={4.5}
                fill={colors.white}
                stroke={colors.success}
                strokeWidth={2.5}
              />
            </>
          )}
        </Svg>
      )}

      {/* Ornek birikene kadar bos bir grafik yerine ne beklendigini soyle. */}
      {samples.length < 2 && (
        <View style={styles.waiting} pointerEvents="none">
          <Text style={styles.waitingText}>Güç verisi toplanıyor…</Text>
        </View>
      )}
    </View>
  );
}

const useStyles = createThemedStyles((colors) => ({
  waiting: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingText: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.sm },
}));
