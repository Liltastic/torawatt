import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Stop } from 'react-native-svg';

import { colors } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type ChargeRingMode = 'starting' | 'charging' | 'completed';

interface ChargeRingProps {
  /** 0-100 */
  progress: number;
  mode: ChargeRingMode;
  size?: number;
  strokeWidth?: number;
  /** Halkanin ortasindaki icerik (yuzde, durum yazisi). */
  children?: React.ReactNode;
}

/** Bağlanırken dönen yay, halkanın bu kadarını kaplar. */
const STARTING_ARC = 0.22;

/**
 * Koyu zemin icin sarj halkasi: turkuazdan yesile gradyanli yay, arkasinda
 * yumusak bir hale, ucunda beyaz bir dugme.
 *
 * Performans: ilerleme SVG'nin strokeDashoffset ozelligiyle, dugme cx/cy ile,
 * hale opacity ile, baglanma donusu transform ile animasyonlu. Hicbiri yerlesim
 * hesabi tetiklemiyor. Statik katmanlar (iz, ic kesikli halka, gradyan
 * tanimlari) ilerlemeye bagli olmadigi icin her tikta yeniden hesaplanmiyor.
 */
export function ChargeRing({ progress, mode, size = 248, strokeWidth = 16, children }: ChargeRingProps) {
  const reduceMotion = useReducedMotion();
  const center = size / 2;
  const radius = (size - strokeWidth) / 2 - 6;
  const circumference = 2 * Math.PI * radius;
  const innerRadius = radius - strokeWidth / 2 - 12;

  const clamped = Math.min(100, Math.max(0, progress));
  const animatedProgress = useSharedValue(mode === 'starting' ? STARTING_ARC * 100 : clamped);
  const spin = useSharedValue(0);
  const glow = useSharedValue(mode === 'completed' ? 1 : 0.7);

  useEffect(() => {
    const target = mode === 'starting' ? STARTING_ARC * 100 : clamped;
    animatedProgress.set(withTiming(target, { duration: 800, easing: Easing.out(Easing.cubic) }));
  }, [clamped, mode, animatedProgress]);

  // Baglanirken yay doner; sarj baslayinca donus durur ve yay gercek yuzdeye akar.
  useEffect(() => {
    if (mode === 'starting' && !reduceMotion) {
      spin.set(withRepeat(withTiming(360, { duration: 1100, easing: Easing.linear }), -1, false));
    } else {
      cancelAnimation(spin);
      // Geri sarmak yerine aninda sifirla: 270 dereceden 0'a animasyon, yayin
      // tersine hizla savrulmasi gibi gorunuyordu.
      spin.set(0);
    }
  }, [mode, reduceMotion, spin]);

  // Sarj surerken hale nefes alir; bitince sabit ve tam parlaklikta kalir.
  useEffect(() => {
    if (mode === 'charging' && !reduceMotion) {
      glow.set(
        withRepeat(
          withSequence(
            withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
            withTiming(0.55, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
          false,
        ),
      );
    } else {
      cancelAnimation(glow);
      glow.set(withTiming(mode === 'completed' ? 1 : 0.5, { duration: 400 }));
    }
  }, [mode, reduceMotion, glow]);

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.value / 100),
  }));

  // Yayin ucundaki dugme: saat 12'den baslayip yuzdeyle doner.
  const knobProps = useAnimatedProps(() => {
    const angle = ((animatedProgress.value / 100) * 360 - 90) * (Math.PI / 180);
    return {
      cx: center + radius * Math.cos(angle),
      cy: center + radius * Math.sin(angle),
    };
  });

  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  const completed = mode === 'completed';
  const gradientFrom = completed ? colors.success : colors.primary;
  const gradientTo = completed ? '#7BF0B8' : colors.success;
  const showKnob = mode === 'charging' && clamped > 1;

  return (
    <View style={{ width: size, height: size }}>
      {/* Hale: yayin hemen arkasinda halka biciminde, merkezde ve disarida saydam. */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, glowStyle]}>
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id="ringGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0.58" stopColor={gradientFrom} stopOpacity={0} />
              <Stop offset="0.84" stopColor={gradientFrom} stopOpacity={0.26} />
              <Stop offset="1" stopColor={gradientFrom} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={center} cy={center} r={center} fill="url(#ringGlow)" />
        </Svg>
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, spinStyle]}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="ringArc" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={gradientFrom} />
              <Stop offset="1" stopColor={gradientTo} />
            </LinearGradient>
          </Defs>

          {/* Iz */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="rgba(255, 255, 255, 0.09)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Ic dekoratif kesikli halka: gosterge hissi */}
          <Circle
            cx={center}
            cy={center}
            r={innerRadius}
            stroke="rgba(255, 255, 255, 0.10)"
            strokeWidth={2}
            strokeDasharray="1.5 7"
            fill="none"
          />
          {/* Ilerleme yayi */}
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke="url(#ringArc)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            animatedProps={arcProps}
            transform={`rotate(-90 ${center} ${center})`}
          />
          {showKnob && (
            <AnimatedCircle
              r={strokeWidth / 2 - 2}
              fill={colors.white}
              stroke={gradientTo}
              strokeWidth={2}
              animatedProps={knobProps}
            />
          )}
        </Svg>
      </Animated.View>

      <View style={styles.center} pointerEvents="none">
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
