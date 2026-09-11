import { type StyleProp, type ViewStyle } from 'react-native';
import Svg, { G, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';

import { colors } from '@/theme';

const VIEW_W = 1000;
const VIEW_H = 340;

interface LogoProps {
  /** Genislik (dp); yukseklik oran korunarak hesaplanir. */
  width?: number;
  color?: string;
  accentColor?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * TORA WATT markasi - vektor olarak yeniden kodlandi (ham logo dosyasi yok,
 * yalnizca sohbette gorsel olarak paylasildi). Ikon: kucuk bir ok/parca
 * ile acik birakilmis mavi halka + halkanin sol kalinlasan kismina
 * islenmis beyaz fis/priz (E) sekli - orijinal logonun ayirt edici ogesi.
 */
export function Logo({ width = 180, color = colors.text, accentColor = colors.location, style }: LogoProps) {
  const height = (width / VIEW_W) * VIEW_H;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} style={style}>
      {/* Halka: sag tarafta kucuk bir bosluk birakilir, o bosluk oku doldurur. */}
      <Path
        d="M172.1,129.3 A75,75 0 1 0 172.1,170.7"
        fill="none"
        stroke={accentColor}
        strokeWidth={56}
        strokeLinecap="round"
      />
      <Polygon points="172.1,127 172.1,173 215,150" fill={accentColor} />

      {/* Halkanin sol (kalin) kismina islenmis beyaz fis/priz (E) sekli. */}
      <G fill={colors.white}>
        <Rect x={18} y={112} width={9} height={76} rx={1.5} />
        <Rect x={18} y={112} width={32} height={9} rx={1.5} />
        <Rect x={18} y={146} width={27} height={9} rx={1.5} />
        <Rect x={18} y={179} width={32} height={9} rx={1.5} />
      </G>

      <SvgText x={255} y={235} fontWeight="800" fontSize={185} fill={color}>
        tora
      </SvgText>
      <SvgText x={580} y={292} fontWeight="500" fontSize={34} letterSpacing={14} fill={color}>
        WATT
      </SvgText>
    </Svg>
  );
}
