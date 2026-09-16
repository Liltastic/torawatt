import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, type ImageContentPosition, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Logo } from '@/components/Logo';
import { colors, radius, spacing, typography } from '@/theme';

const TOP_ROW_H = 40;
const LINE_W = 56;

/**
 * Tam ekran fotografin uzerindeki perde. Ust ucta durum cubugu simgeleri ve
 * beyaz logo icin, alt ucta formun tamami icin kontrast uretir; ortada
 * fotografin nefes almasina izin verir ve hafif turkuaza caler.
 *
 * Tek bir gradyan: ayri tonlama/perde katmanlari gorsel olarak ayni sonucu
 * verip her karede bir tam ekran beste daha ekliyordu.
 */
const SCRIM_COLORS = [
  'rgba(6, 34, 29, 0.62)',
  'rgba(10, 70, 63, 0.34)',
  'rgba(8, 44, 39, 0.86)',
  'rgba(6, 28, 24, 0.97)',
] as const;
const SCRIM_LOCATIONS = [0, 0.24, 0.56, 1] as const;

interface AuthLayoutProps {
  source: ImageSource | number;
  /** Fotografin gorunur kalan bolgesi (bkz. assets/images/auth/CREDITS.md). */
  contentPosition?: ImageContentPosition;
  /** Buyuk harfle, Turkce noktali I ile YAZILMIS metin; toUpperCase kullanma. */
  eyebrow: string;
  title: string;
  subtitle: string;
  onBack: () => void;
  /** Form: alanlar, hata satiri, ana buton ve alttaki gecis baglantisi. */
  children: React.ReactNode;
}

/**
 * Giris ve kayit ekranlarinin ortak kabugu: tam ekran fotograf, perde,
 * ust satir (geri + logo) ve baslik blogu. Form cocuk olarak geliyor.
 *
 * Fotograf ve perde kaydirma alaninin DISINDA, sabit duruyor: klavye acilinca
 * yalnizca icerik kayiyor. Hero'nun eski yukseklik animasyonu boylece tamamen
 * kalkti - kare basina yerlesim hesabi yok.
 */
export function AuthLayout({
  source,
  contentPosition = 'center',
  eyebrow,
  title,
  subtitle,
  onBack,
  children,
}: AuthLayoutProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();

  const line = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) return;
    line.set(withDelay(320, withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) })));
  }, [line, reduceMotion]);

  // width yerine translateX: genislik animasyonu her karede yerlesim hesabi
  // tetikliyordu, bu ise GPU'da kalan saf donusum.
  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (line.value - 1) * LINE_W }],
  }));

  return (
    <View style={styles.root}>
      {/* Fotograf saydam durum cubugunun altina cizilir; simgeler acik renk olmali. */}
      <StatusBar style="light" />

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
      <LinearGradient
        pointerEvents="none"
        colors={SCRIM_COLORS}
        locations={SCRIM_LOCATIONS}
        style={StyleSheet.absoluteFill}
      />

      {/* KeyboardAvoidingView BILEREK yok: iOS'ta alt dolgusunu JavaScript
          tarafinda animasyonluyor, yani klavye her acilip kapandiginda kare
          basina bir yerlesim hesabi cikiyordu. automaticallyAdjustKeyboardInsets
          ayni isi UIScrollView'in icinde yapiyor; Android'de adjustResize
          pencereyi kucultuyor ve bu prop yok sayiliyor. */}
      <ScrollView
        style={styles.flex}
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never">
        <Animated.View entering={FadeIn.duration(300)} style={styles.topRow}>
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

        {/* Bosluk yer varken basligi asagi iter, klavye acilinca kendiliginden erir. */}
        <View style={styles.spacer} />

        <Animated.View entering={FadeInDown.delay(120).duration(420)} style={styles.headline}>
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
          <Text style={styles.subtitle} maxFontSizeMultiplier={1.3}>
            {subtitle}
          </Text>
        </Animated.View>

        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.heroDark },
  flex: { flex: 1 },

  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },

  topRow: {
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

  spacer: { flex: 1, minHeight: spacing.xxxl },

  headline: { marginBottom: spacing.xxl },
  eyebrow: { ...typography.captionStrong, letterSpacing: 1.4, color: 'rgba(255, 255, 255, 0.76)' },
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
  subtitle: {
    ...typography.body,
    color: 'rgba(255, 255, 255, 0.84)',
    marginTop: spacing.md,
    maxWidth: 340,
  },
});
