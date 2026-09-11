import { type StyleProp, type ViewStyle } from 'react-native';
import Svg, { G, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';

import { colors } from '@/theme';

const VIEW_W = 620;
const VIEW_H = 240;

interface LogoProps {
  /** Genislik (dp); yukseklik oran korunarak hesaplanir. */
  width?: number;
  color?: string;
  accentColor?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * TORA WATT markasi - vektor olarak yeniden kodlandi (ham logo dosyasi yok,
 * yalnizca sohbette gorsel olarak paylasildi). "A" harfi ozel olarak
 * cizildi: capraz iki bacaktan olusan icibos bir ucgen ve tepesindeki
 * bosluğu dolduran kucuk mavi ucgen - orijinal logonun ayirt edici detayi.
 */
export function Logo({ width = 180, color = colors.text, accentColor = colors.location, style }: LogoProps) {
  const height = (width / VIEW_W) * VIEW_H;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} style={style}>
      {/* T'nin ustune tasan mavi vurgu cubugu. */}
      <Rect x={4} y={18} width={118} height={26} rx={2} fill={accentColor} />
      <SvgText x={0} y={168} fontWeight="900" fontSize={168} letterSpacing={-4} fill={color}>
        TOR
      </SvgText>

      {/* "A": icibos ucgen (evenodd) + tepedeki mavi ucgen dolgusu. */}
      <G transform="translate(388,0)">
        <Path fillRule="evenodd" fill={color} d="M90,0 L180,168 L0,168 Z M90,34 L146,168 L34,168 Z" />
        <Polygon points="90,34 75,70 105,70" fill={accentColor} />
      </G>

      <SvgText x={58} y={228} fontWeight="700" fontSize={34} letterSpacing={10} fill={color}>
        WATT
      </SvgText>
    </Svg>
  );
}
