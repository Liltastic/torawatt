import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, type ImageContentPosition, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef } from 'react';
import { Dimensions, Keyboard, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Logo } from '@/components/Logo';
import { colors, radius, spacing, typography } from '@/theme';

/**
 * Giris/kayit ekranlarinin fotografli ust bolumu.
 *
 * Olcu, ekran yuksekliginden BIR KEZ alinir: useWindowDimensions Android'de
 * klavye acilinca (adjustResize) kuculuyor ve hero ziplardi. Uygulama dikey
 * kilitli oldugu icin modul sabiti yeterli.
 */
const SCREEN_H = Dimensions.get('screen').height;
/** iPhone SE / 640dp Android: hero kisalir, alt baslik hero'dan sayfaya iner. */
export const AUTH_HERO_SMALL = SCREEN_H < 700;
const HERO_H = Math.min(380, Math.max(280, Math.round(SCREEN_H * 0.42)));
const TOP_ROW_H = 40;
const FADE_H = 96;
const HEADLINE_BOTTOM = AUTH_HERO_SMALL ? 96 : 112;
const LINE_W = 56;

/**
 * Turkuaz tonlama (%16) ve baslik perdesi (heroDark, ust %58 -> alt %94) TEK
 * gradyanda birlesik. Ayri bir tonlama katmani gorsel olarak ayni sonucu
 * veriyordu ama fotografin uzerinde her karede beste edilen bir tam ekran
 * katman daha demekti; duraklar iki katmanin alfa bindirmesinin cozumu.
 */
const SCRIM_COLORS = [
  'rgba(11, 68, 61, 0.647)',
  'rgba(12, 143, 130, 0.16)',
  'rgba(11, 69, 62, 0.622)',
  'rgba(11, 60, 54, 0.95)',
] as const;
const SCRIM_LOCATIONS = [0, 0.24, 0.56, 1] as const;

/**
 * Klavye modeli: 0 = hero acik, 1 = hero daraltilmis. iOS'ta keyboardWill*
 * olaylari klavye animasyonuyla es zamanli; Android'de olay pencere
 * kuculduktan SONRA geliyor, o yuzden daralma alanin onFocus'undan
 * tetikleniyor ve keyboardDidShow yalnizca yedek.
 */
export function useAuthKeyboard() {
  const kb = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const visible = useRef(false);

  useEffect(() => {
    const show = (duration: number) => {
      visible.current = true;
      kb.set(
        withTiming(1, { duration: reduceMotion ? 0 : duration, easing: Easing.bezier(0.38, 0.7, 0.125, 1) }),
      );
    };
    const hide = (duration: number) => {
      visible.current = false;
      kb.set(withTiming(0, { duration: reduceMotion ? 0 : duration, easing: Easing.out(Easing.cubic) }));
    };

    const subscriptions =
      Platform.OS === 'ios'
        ? [
            Keyboard.addListener('keyboardWillShow', (event) => show(event.duration || 250)),
            Keyboard.addListener('keyboardWillHide', (event) => hide(event.duration || 250)),
          ]
        : [
            Keyboard.addListener('keyboardDidShow', () => {
              if (!visible.current) show(200);
            }),
            Keyboard.addListener('keyboardDidHide', () => hide(220)),
          ];
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, [kb, reduceMotion]);

  const onFieldFocus = useCallback(() => {
    if (Platform.OS !== 'android' || visible.current) return;
    visible.current = true;
    kb.set(withTiming(1, { duration: reduceMotion ? 0 : 200, easing: Easing.out(Easing.cubic) }));
  }, [kb, reduceMotion]);

  /** Guvenlik agi: klavye kapaliyken hero daralmis kaldiysa ilk kaydirmada acilir. */
  const onScrollBeginDrag = useCallback(() => {
    if (!visible.current && kb.get() !== 0) {
      kb.set(withTiming(0, { duration: reduceMotion ? 0 : 200 }));
    }
  }, [kb, reduceMotion]);

  return { kb, onFieldFocus, onScrollBeginDrag };
}

interface AuthHeroProps {
  source: ImageSource | number;
  /** Fotografin gorunur kalan bolgesi; ozne ust-orta olmali (bkz. assets/images/auth/CREDITS.md). */
  contentPosition?: ImageContentPosition;
  /** Buyuk harfle, Turkce noktali I ile YAZILMIS metin; toUpperCase kullanma. */
  eyebrow: string;
  title: string;
  subtitle?: string;
  onBack: () => void;
  kb: SharedValue<number>;
}

export function AuthHero({
  source,
  contentPosition = 'top center',
  eyebrow,
  title,
  subtitle,
  onBack,
  kb,
}: AuthHeroProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const compactHeight = insets.top + spacing.sm + TOP_ROW_H + spacing.md;

  // Acilista dolan enerji cizgisi. Fotografin "Ken Burns" yakinlasmasi
  // kaldirildi: overflow:hidden icindeki tam ekran bir dokuyu 900 ms boyunca
  // her karede yeniden orneklemek, ekranin en pahali isiydi.
  const line = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) return;
    line.set(withDelay(320, withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) })));
  }, [line, reduceMotion]);

  const containerStyle = useAnimatedStyle(() => ({
    height: interpolate(kb.value, [0, 1], [HERO_H, compactHeight]),
  }));
  // Daraltilmis halde fotograf sonup altindaki heroDark zemin one cikiyor.
  // Ayni etkiyi ustune serilen bir ortu katmaniyla yapmak, surekli beste
  // edilen bir tam ekran katman daha demekti.
  const photoStyle = useAnimatedStyle(() => ({
    opacity: interpolate(kb.value, [0.4, 1], [1, 0.22], Extrapolation.CLAMP),
  }));
  const pageFadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(kb.value, [0.6, 1], [1, 0], Extrapolation.CLAMP),
  }));
  const headlineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(kb.value, [0, 0.45], [1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(kb.value, [0, 1], [0, -16]) }],
  }));
  // width yerine translateX: genislik animasyonu her karede yerlesim hesabi
  // tetikliyordu, bu ise GPU'da kalan saf donusum.
  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (line.value - 1) * LINE_W }],
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, photoStyle]}>
        <Image
          source={source}
          contentFit="cover"
          contentPosition={contentPosition}
          transition={{ duration: 300, effect: 'cross-dissolve' }}
          priority="high"
          cachePolicy="memory-disk"
          accessible={false}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Tonlama + baslik perdesi tek gecis (bkz. SCRIM_COLORS). */}
      <LinearGradient
        pointerEvents="none"
        colors={SCRIM_COLORS}
        locations={SCRIM_LOCATIONS}
        style={StyleSheet.absoluteFill}
      />

      {/* Alt kenar nane sayfaya erir: fotograf ve form tek yuzey gibi okunur. */}
      <Animated.View pointerEvents="none" style={[styles.pageFade, pageFadeStyle]}>
        <LinearGradient colors={['rgba(242, 251, 246, 0)', colors.background]} style={StyleSheet.absoluteFill} />
      </Animated.View>

      <Animated.View entering={FadeIn.duration(300)} style={[styles.topRow, { top: insets.top + spacing.sm }]}>
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel="Geri"
          haptic="tap"
          scaleTo={0.92}
          hitSlop={10}
          onPress={onBack}
          style={styles.backChip}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </AnimatedPressable>
        <View accessibilityRole="image" accessibilityLabel="TORA WATT">
          <Logo width={112} color={colors.white} accentColor={colors.primary} />
        </View>
      </Animated.View>

      {/* Giris animasyonu (entering) ile klavye animasyonu ayri katmanlarda:
          ikisi ayni View'da opacity/transform'u paylasinca Reanimated uyariyor. */}
      <Animated.View
        pointerEvents="none"
        entering={FadeInDown.delay(120).duration(420)}
        style={styles.headline}>
        <Animated.View style={headlineStyle}>
          <Text style={styles.eyebrow} maxFontSizeMultiplier={1.3}>
            {eyebrow}
          </Text>
          <Text style={styles.title} numberOfLines={2} maxFontSizeMultiplier={1.3}>
            {title}
          </Text>
          <View style={styles.lineTrack}>
            <Animated.View style={[styles.lineFill, lineStyle]}>
              <LinearGradient
                colors={[colors.primary, colors.success]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.lineGradient}
              />
            </Animated.View>
          </View>
          {!AUTH_HERO_SMALL && !!subtitle && (
            <Text style={styles.subtitle} maxFontSizeMultiplier={1.3}>
              {subtitle}
            </Text>
          )}
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden', backgroundColor: colors.heroDark },
  pageFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: FADE_H },

  topRow: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    height: TOP_ROW_H,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backChip: {
    width: TOP_ROW_H,
    height: TOP_ROW_H,
    borderRadius: radius.chip,
    backgroundColor: 'rgba(5, 24, 20, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headline: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    bottom: 0,
    paddingBottom: HEADLINE_BOTTOM,
  },
  eyebrow: { ...typography.captionStrong, letterSpacing: 1.4, color: 'rgba(255, 255, 255, 0.72)' },
  title: { ...typography.h1, color: colors.white, marginTop: spacing.sm },
  lineTrack: {
    marginTop: spacing.md,
    width: LINE_W,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    overflow: 'hidden',
  },
  lineFill: { width: LINE_W, height: 3 },
  lineGradient: { flex: 1, borderRadius: 2 },
  subtitle: { ...typography.body, color: 'rgba(255, 255, 255, 0.82)', marginTop: spacing.sm, maxWidth: 320 },
});
