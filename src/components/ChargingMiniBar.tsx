import Ionicons from '@expo/vector-icons/Ionicons';
import { GlassView } from 'expo-glass-effect';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Keyboard, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, runOnJS } from 'react-native-reanimated';

import { AnimatedNumber } from '@/components/AnimatedNumber';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { ProgressRing } from '@/components/ProgressRing';
import { useSessionStore } from '@/store/session';
import {
  createThemedStyles,
  radius,
  spacing,
  typography,
  useColors,
  useColorSchemeName,
  withAlpha,
  type Palette,
} from '@/theme';
import type { ChargingSessionStatus } from '@/types/domain';
import { formatEnergy, formatPower } from '@/utils/format';
import { GLASS_ENABLED } from '@/utils/glass';
import { useTabBarInset } from '@/utils/tabBar';

/** Sabit yukseklik: ekranlar alt paylarini bu degerden hesapliyor. */
const BAR_HEIGHT = 58;
/** Sekme cubugu ile mini cubuk arasindaki bosluk. */
const BAR_GAP = spacing.sm;

const ON_DARK_MUTED = 'rgba(255, 255, 255, 0.62)';
/** Yuzde her saniye degisiyor: esit genislikli rakamlar yazinin titremesini onler. */
const TABULAR = { fontVariant: ['tabular-nums' as const] };
/**
 * Yukseklik sabit oldugu icin buyuk yazi ayarinda satirlar tasmasin. Tam
 * degerler zaten dokununca acilan Sarj ekraninda buyuk puntoyla var.
 */
const MAX_FONT_SCALE = 1.2;

const formatPercentLabel = (value: number) => `%${Math.round(value)}`;

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * Etiketler ve tonlar Sarj ekranindaki durum rozetiyle ayni. `tone` koyu
 * markali zemin icin; `glassTone` iOS'taki cam zemin icin ayni ailenin o
 * temada okunur tonu (acik temada koyu, koyu temada acik). Renk degil palet
 * anahtari tutuluyor: deger o anki temadan okunuyor.
 */
const STATUS: Record<
  ChargingSessionStatus,
  { title: string; icon: IoniconName; tone: keyof Palette; glassTone: keyof Palette }
> = {
  STARTING: {
    title: 'Bağlanıyor',
    icon: 'sync-outline',
    tone: 'warningOnDark',
    glassTone: 'warningText',
  },
  CHARGING: {
    title: 'Şarj sürüyor',
    icon: 'flash',
    tone: 'primaryOnDark',
    glassTone: 'primaryText',
  },
  STOPPING: {
    title: 'Durduruluyor',
    icon: 'stop',
    tone: 'warningOnDark',
    glassTone: 'warningText',
  },
  COMPLETED: {
    title: 'Şarj tamamlandı',
    icon: 'checkmark',
    tone: 'successOnDark',
    glassTone: 'successText',
  },
  ERROR: { title: 'Şarj hatası', icon: 'alert', tone: 'dangerOnDark', glassTone: 'dangerText' },
};

/**
 * Mini cubuk gorunurken kapladigi dikey alan (cubuk + sekme cubuguyla arasi).
 * Kaydirilabilir icerik son ogesini bu kadar yukarida bitirmeli, yoksa cubugun
 * altinda kalir.
 *
 * Klavye acikken cubuk gizleniyor ama bu deger BILEREK degismiyor: harita
 * ekraninda sheet'in snap noktalari buna bagli ve aramaya yazarken sheet'in
 * yerinden oynamasi istenmez.
 */
export function useChargingMiniBarInset(): number {
  const active = useSessionStore((state) => state.session !== null);
  return active ? BAR_HEIGHT + BAR_GAP : 0;
}

/**
 * Android'de pencere klavyeye gore kuculuyor ve ekranin dibine sabitlenmis
 * cubuk klavyenin hemen ustune cikiyor. Rota ekraninda orada adres arama
 * sonuclari oldugu icin dokunmayi engelliyordu. iOS'ta klavyenin altinda
 * kalip gorunmuyor; iki platformda da gizlemek en temizi.
 */
function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(() => Keyboard.isVisible());

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return visible;
}

/**
 * Sarj surerken diger sekmelerde, sekme cubugunun hemen ustunde duran canli
 * ozet; dokununca Sarj sekmesine gecer. Kilit ekrani gostergesinin (Live
 * Activity) uygulama ici karsiligi - o, Expo Go'da yapilamiyor.
 *
 * Her sekme ekrani bunu kendi kok gorunumunun EN SONUNA koyar: mutlak
 * konumlu ve kardeslerinin ustunde cizilmesi gerekiyor (harita ekraninda alt
 * sheet'in de ustunde). Sekme cubugu yerlesiminde tek bir kopya yerine her
 * ekranda ayri kopya olmasinin sebebi alt pay: iOS'ta cam cubugun yuksekligini
 * ancak sekme ekraninin icindeki guvenli alan biliyor (bkz. utils/tabBar).
 */
export function ChargingMiniBar() {
  const tabBarInset = useTabBarInset();
  const keyboardVisible = useKeyboardVisible();
  const status = useSessionStore((state) => state.session?.status);

  if (!status || keyboardVisible) return null;

  // Ayri bilesen: cubuk her gorundugunde yeniden kuruluyor, yani iOS'taki cam
  // durumu (bkz. MiniBar) her giriste bastan basliyor.
  return <MiniBar status={status} bottom={tabBarInset + BAR_GAP} />;
}

function MiniBar({ status, bottom }: { status: ChargingSessionStatus; bottom: number }) {
  const colors = useColors();
  const colorScheme = useColorSchemeName();
  const styles = useStyles();
  const router = useRouter();

  // Her biri ilkel deger: oturum her saniye yeni bir nesne uretiyor, nesneyi
  // secseydik cubuk degismeyen alanlar icin de her tikte yeniden cizilirdi.
  const battery = useSessionStore((state) => Math.round(state.session?.batteryPercent ?? 0));
  const powerKw = useSessionStore((state) => state.session?.powerKw ?? 0);
  const energyKwh = useSessionStore((state) =>
    state.session?.status === 'COMPLETED' ? state.session.energyKwh : 0,
  );
  const stationName = useSessionStore((state) => state.meta?.stationName ?? '');

  // iOS 26+: zemin Liquid Glass. Cubuk solarak giriyor ve opaklik 0'dan
  // basliyor; bu sirada cam hic cizilmiyor ve sonra da gelmiyor (bkz.
  // utils/glass). Cam, giris bitince aciliyor; o ana kadar yari saydam yuzey
  // rengi bir zemin cubugu okunur tutuyor.
  const [glassOn, setGlassOn] = useState(false);

  const config = STATUS[status];
  const tone = colors[GLASS_ENABLED ? config.glassTone : config.tone];
  const detail =
    status === 'CHARGING' && powerKw > 0
      ? formatPower(powerKw)
      : status === 'COMPLETED'
        ? formatEnergy(energyKwh)
        : null;

  const entering = GLASS_ENABLED
    ? FadeInDown.duration(280).withCallback((finished) => {
        'worklet';
        if (finished) runOnJS(setGlassOn)(true);
      })
    : FadeInDown.duration(280);

  return (
    <Animated.View
      entering={entering}
      exiting={FadeOutDown.duration(180)}
      pointerEvents="box-none"
      style={[styles.wrap, { bottom }]}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={`${config.title}, yüzde ${battery}, ${stationName}. Şarj ekranını aç.`}
        haptic="tap"
        scaleTo={0.98}
        onPress={() => router.navigate('/charging')}
        style={[styles.bar, GLASS_ENABLED && (glassOn ? styles.barGlass : styles.barGlassPending)]}>
        {GLASS_ENABLED && (
          <GlassView
            pointerEvents="none"
            glassEffectStyle={
              glassOn ? { style: 'regular', animate: true, animationDuration: 0.25 } : 'none'
            }
            // Yazi renkleri temadan geliyor; cam da ayni temada cizilmeli.
            colorScheme={colorScheme}
            style={styles.glass}
          />
        )}

        <ProgressRing
          progress={battery}
          size={38}
          strokeWidth={3}
          color={tone}
          trackColor={GLASS_ENABLED ? withAlpha(colors.text, 0.12) : 'rgba(255, 255, 255, 0.14)'}>
          <Ionicons name={config.icon} size={15} color={tone} />
        </ProgressRing>

        <View style={styles.texts}>
          <Text
            style={[styles.title, GLASS_ENABLED && styles.titleOnGlass]}
            numberOfLines={1}
            maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {config.title}
            <Text style={[styles.separator, GLASS_ENABLED && styles.mutedOnGlass]}> · </Text>
            <AnimatedNumber
              value={battery}
              format={formatPercentLabel}
              style={[styles.percent, { color: tone }, TABULAR]}
            />
          </Text>
          <Text
            style={[styles.subtitle, GLASS_ENABLED && styles.mutedOnGlass]}
            numberOfLines={1}
            maxFontSizeMultiplier={MAX_FONT_SCALE}>
            {stationName}
            {detail ? ` · ${detail}` : ''}
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={18}
          color={GLASS_ENABLED ? colors.textSecondary : ON_DARK_MUTED}
        />
      </AnimatedPressable>
    </Animated.View>
  );
}

const useStyles = createThemedStyles((colors) => ({
  wrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    // Android'de gorunum sirasini elevation belirliyor: harita ekranindaki alt
    // sheet 12 ile ciziliyor ve cubuk sonra render edilse de onun ALTINDA
    // kaliyordu. Kapsayicinin arka plani olmadigi icin golge uretmez, yalnizca
    // siralamayi belirler.
    elevation: 16,
    zIndex: 16,
  },
  bar: {
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: spacing.md,
    borderRadius: radius.search,
    backgroundColor: colors.heroDark,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#062420',
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  // iOS 26+ cam: dolgu, kenarlik ve derinlik camin kendisinden geliyor.
  barGlass: { backgroundColor: 'transparent', borderWidth: 0, shadowOpacity: 0 },
  // Cam acilana kadar (giris solmasi) okunur bir zemin.
  barGlassPending: {
    backgroundColor: withAlpha(colors.surface, 0.9),
    borderWidth: 0,
    shadowOpacity: 0.12,
  },
  glass: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.search,
  },
  texts: { flex: 1, marginHorizontal: spacing.md },
  title: { ...typography.bodyStrong, lineHeight: 20, color: colors.white },
  titleOnGlass: { color: colors.text },
  separator: { color: ON_DARK_MUTED, fontWeight: '400' },
  percent: { fontWeight: '700' },
  subtitle: { ...typography.caption, color: ON_DARK_MUTED, marginTop: 1 },
  mutedOnGlass: { color: colors.textSecondary },
}));
