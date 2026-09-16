import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  cancelAnimation,
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import {
  AnimatedNumber,
  AnimatedPressable,
  Button,
  Card,
  ChargeRing,
  ConnectorBadge,
  PowerBadge,
  PowerCurve,
  type ChargeRingMode,
} from '@/components';
import { useCreateHistoryEntry } from '@/queries/history';
import { useActiveVehicle } from '@/queries/vehicles';
import { estimateChargeMinutes, useSessionStore } from '@/store/session';
import {
  createThemedStyles,
  fontFamilies,
  radius,
  spacing,
  typography,
  useColors,
  withAlpha,
} from '@/theme';
import { currentTypeOf } from '@/types/domain';
import { formatDuration, formatEnergy, formatPower, formatPrice } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { useTabBarInset } from '@/utils/tabBar';

/** Grafikte tutulan en fazla ornek sayisi. */
const HISTORY_LIMIT = 40;

/** Bekleme cizimindeki kesikli halkanin bir tam donusu: fark edilir ama dikkat cekmez. */
const IDLE_SPIN_MS = 24_000;
/** Bekleme cizimindeki simsegin bir yukari-bir asagi suzulme suresi (tek yon). */
const IDLE_FLOAT_MS = 1800;

/** Sayilar her saniye degisiyor: esit genislikli rakamlar yazinin titremesini onler. */
const TABULAR = { fontVariant: ['tabular-nums' as const] };

const ON_DARK_MUTED = 'rgba(255, 255, 255, 0.62)';

/** 7 -> "7 dk", 75 -> "1 sa 15 dk" */
function formatEta(minutes: number): string {
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} sa` : `${hours} sa ${rest} dk`;
}

/** Sayi ve birimi ayri basmak icin: "20,5" + "kWh" */
function splitUnit(formatted: string): { value: string; unit: string } {
  const i = formatted.lastIndexOf(' ');
  if (i === -1) return { value: formatted, unit: '' };
  return { value: formatted.slice(0, i), unit: formatted.slice(i + 1) };
}

// AnimatedNumber bicimleyicileri: modul seviyesinde, yani kimlikleri sabit
// (her render'da yeni fonksiyon verilseydi akis her tikte bastan baslardi).
const formatWhole = (value: number) => String(Math.round(value));
const formatEnergyValue = (kwh: number) => splitUnit(formatEnergy(kwh)).value;
const formatPowerValue = (kw: number) => splitUnit(formatPower(kw)).value;
const formatRangeGain = (km: number) => `+${Math.round(km)}`;
const formatCost = (value: number) => formatPrice(value);

export default function ChargingScreen() {
  const colors = useColors();
  const styles = useStyles();
  const router = useRouter();
  // iOS sekme cubugu icerigin uzerine biniyor (bkz. utils/tabBar).
  const tabBarInset = useTabBarInset();
  const session = useSessionStore((state) => state.session);
  const meta = useSessionStore((state) => state.meta);
  const elapsedSeconds = useSessionStore((state) => state.elapsedSeconds);
  const stopSession = useSessionStore((state) => state.stop);
  const clearSession = useSessionStore((state) => state.clear);
  const setSessionVehicle = useSessionStore((state) => state.setVehicle);
  const activeVehicle = useActiveVehicle();

  const [powerHistory, setPowerHistory] = useState<number[]>([]);
  const lastSampleRef = useRef<{ sessionId: string; energyKwh: number } | undefined>(undefined);
  const createHistoryEntry = useCreateHistoryEntry();
  const archivedSessionIdRef = useRef<string | undefined>(undefined);
  const wasFinishedRef = useRef(false);

  const battery = Math.round(session?.batteryPercent ?? 0);
  const isFinished = session?.status === 'COMPLETED';

  // Simulasyon store'u React Query'ye erisemiyor: kapasite ve aracin guc
  // tavani buradan besleniyor, yoksa her arac 60 kWh'lik varsayimla dolardi.
  useEffect(() => {
    if (!activeVehicle) return;
    setSessionVehicle(activeVehicle);
  }, [activeVehicle, setSessionVehicle]);

  // Sarj tam bu render'da bitmisse (ve daha once bildirmediysek) basari titresimi ver.
  useEffect(() => {
    if (isFinished && !wasFinishedRef.current) {
      wasFinishedRef.current = true;
      haptics.success();
    } else if (!isFinished) {
      wasFinishedRef.current = false;
    }
  }, [isFinished]);

  // Ornekler oturum kimligiyle birlikte saklaniyor. Sarj sekmesi oturumlar
  // arasinda mount kaliyor ve clearSession() yalnizca store'u temizliyor;
  // kimlik tutulmazsa ikinci oturum birincisinin orneklerini gosterirdi.
  //
  // 0 kW ornek alinmiyor: el sikismadan sarja gecilen ilk tikta durum CHARGING
  // olmus ama guc henuz hesaplanmamis oluyor. O ornek grafigin basina gercekte
  // yasanmamis bir cukur ciziyordu.
  useEffect(() => {
    if (!session || session.status !== 'CHARGING' || session.powerKw <= 0) return;
    const last = lastSampleRef.current;
    if (last?.sessionId === session.id && last.energyKwh === session.energyKwh) return;

    const startedNewSession = last?.sessionId !== session.id;
    lastSampleRef.current = { sessionId: session.id, energyKwh: session.energyKwh };
    setPowerHistory((prev) =>
      startedNewSession ? [session.powerKw] : [...prev, session.powerKw].slice(-HISTORY_LIMIT),
    );
  }, [session]);

  // Oturum COMPLETED olunca gecmise TEK SEFERLIK yaz. Enerji aktarilmadiysa
  // (baslamadan iptal) kayit acmiyoruz - session store'daki eski davranisla ayni.
  useEffect(() => {
    if (!session || !meta || session.status !== 'COMPLETED') return;
    if (session.energyKwh <= 0) return;
    if (archivedSessionIdRef.current === session.id) return;

    archivedSessionIdRef.current = session.id;
    createHistoryEntry.mutate({
      stationId: session.stationId,
      stationName: meta.stationName,
      connectorLabel: meta.connectorLabel,
      startedAt: session.startedAt,
      endedAt: session.endedAt ?? new Date().toISOString(),
      durationMinutes: Math.max(1, Math.round(elapsedSeconds / 60)),
      energyKwh: session.energyKwh,
      pricePerKwh: meta.pricePerKwh,
      cost: session.cost,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, meta]);

  if (!session || !meta) {
    return <IdleState onFindStation={() => router.replace('/map')} bottomInset={tabBarInset} />;
  }

  const mode: ChargeRingMode =
    session.status === 'STARTING' ? 'starting' : isFinished ? 'completed' : 'charging';

  const confirmStop = () => {
    Alert.alert(
      'Şarjı durdur',
      'Oturum kapanacak. Şu ana kadar aktarılan enerji için ücretlendirileceksin.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Durdur', style: 'destructive', onPress: stopSession },
      ],
    );
  };

  const consumption = activeVehicle?.averageConsumptionKwhPer100Km ?? 0;
  // Yuvarlanmamis: yuvarlamayi bicimleyici yapiyor ki sayi akarken ara degerleri gostersin.
  const rangeKm = consumption > 0 ? (session.energyKwh / consumption) * 100 : null;

  const energy = splitUnit(formatEnergy(session.energyKwh));
  const power = splitUnit(formatPower(session.powerKw));

  const eyebrow =
    mode === 'completed' ? 'ŞARJ TAMAMLANDI' : mode === 'starting' ? 'BAĞLANIYOR' : 'AKTİF ŞARJ';

  const minutesTo = (target: number) =>
    formatEta(estimateChargeMinutes(battery, target, meta.ratedPowerKw, meta.batteryCapacityKwh));
  const eta80 = mode === 'starting' ? '—' : battery >= 80 ? 'Ulaşıldı' : minutesTo(80);
  const etaFull = mode === 'starting' ? '—' : minutesTo(100);

  // Tamamlaninca enerji ve tutar zaten metrik kartinda; hero'da onlari tekrar
  // etmek yerine oturumun ozetini veriyoruz.
  const hours = elapsedSeconds / 3600;
  const averagePower = hours > 0 ? formatPower(session.energyKwh / hours) : '—';
  const totalDuration = formatEta(Math.max(1, Math.round(elapsedSeconds / 60)));

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl + tabBarInset }]}
        showsVerticalScrollIndicator={false}>
        {/* Ust bilgi: istasyon ve soket */}
        <Animated.View entering={FadeInDown.duration(320)} style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.eyebrowRow}>
              <LiveDot mode={mode} />
              <Text style={styles.eyebrow}>{eyebrow}</Text>
            </View>
            <View style={styles.elapsedPill}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.elapsedText, TABULAR]}>{formatDuration(elapsedSeconds)}</Text>
            </View>
          </View>
          <Text style={styles.stationName} numberOfLines={1}>
            {meta.stationName}
          </Text>
          <View style={styles.badges}>
            <ConnectorBadge type={meta.connector.type} />
            <PowerBadge
              currentType={currentTypeOf(meta.connector)}
              powerKw={meta.connector.powerKw}
              style={styles.badgeGap}
            />
          </View>
        </Animated.View>

        {/* Hero: canli sarj karti */}
        <Animated.View entering={FadeInDown.delay(80).duration(380)} style={styles.heroShadow}>
          <View style={styles.hero}>
            <LinearGradient
              colors={['#115247', '#0B3B35', '#062420']}
              locations={[0, 0.5, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />

            <View style={styles.heroTop}>
              <HeroStatus mode={mode} />
              {mode === 'charging' && (
                <View style={styles.heroPower}>
                  <Ionicons name="flash" size={14} color={colors.primaryOnDark} />
                  <AnimatedNumber
                    value={session.powerKw}
                    format={formatPowerValue}
                    style={[styles.heroPowerValue, TABULAR]}
                  />
                  <Text style={styles.heroPowerUnit}>{power.unit}</Text>
                </View>
              )}
            </View>

            <View style={styles.ringWrap}>
              <ChargeRing progress={battery} mode={mode}>
                {mode === 'starting' ? (
                  <>
                    <Ionicons name="flash" size={34} color={colors.primaryOnDark} />
                    <Text style={styles.ringCaption}>EL SIKIŞILIYOR</Text>
                  </>
                ) : (
                  <>
                    <View style={styles.percentRow}>
                      <AnimatedNumber
                        value={session.batteryPercent ?? 0}
                        format={formatWhole}
                        style={[styles.percent, TABULAR]}
                      />
                      <Text style={styles.percentSign}>%</Text>
                    </View>
                    <Text style={styles.ringCaption}>{mode === 'completed' ? 'DOLDU' : 'BATARYA'}</Text>
                  </>
                )}
              </ChargeRing>
            </View>

            <View style={styles.heroStats}>
              {mode === 'completed' ? (
                <>
                  <HeroStat label="Ortalama güç" value={averagePower} />
                  <View style={styles.heroDivider} />
                  <HeroStat label="Süre" value={totalDuration} accent />
                </>
              ) : (
                <>
                  <HeroStat label="%80'e" value={eta80} />
                  <View style={styles.heroDivider} />
                  <HeroStat label="Tam dolum" value={etaFull} />
                </>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Canli metrikler */}
        <Animated.View entering={FadeInDown.delay(160).duration(380)}>
          <Card padded={false} style={styles.metricsCard}>
            <Metric
              icon="battery-charging-outline"
              label="Enerji"
              value={session.energyKwh}
              format={formatEnergyValue}
              unit={energy.unit}
            />
            <View style={styles.metricDivider} />
            <Metric icon="wallet-outline" label="Tutar" value={session.cost} format={formatCost} accent />
            <View style={styles.metricDivider} />
            {rangeKm != null ? (
              <Metric
                icon="navigate-outline"
                label="Menzil"
                value={rangeKm}
                format={formatRangeGain}
                unit="km"
              />
            ) : (
              <Metric
                icon="speedometer-outline"
                label="Güç"
                value={session.powerKw}
                format={formatPowerValue}
                unit={power.unit}
              />
            )}
          </Card>
        </Animated.View>

        {/* Guc egrisi */}
        <Animated.View entering={FadeInDown.delay(220).duration(380)}>
          <Card style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Güç eğrisi</Text>
              <Text style={[styles.cardMeta, TABULAR]}>Tepe {formatPower(meta.ratedPowerKw)}</Text>
            </View>
            <PowerCurve values={powerHistory} ratedKw={meta.ratedPowerKw} />
            <Text style={styles.cardCaption}>
              {"Batarya %80'i geçince güç kademeli olarak düşer. Bu, bataryayı korumak içindir."}
            </Text>
          </Card>
        </Animated.View>

        {/* Oturum ayrintilari */}
        <Animated.View entering={FadeInDown.delay(280).duration(380)}>
          <Card style={styles.sectionCard}>
            <Text style={styles.cardTitle}>Oturum</Text>
            <DetailRow label="Birim fiyat" value={`${formatPrice(meta.pricePerKwh)} / kWh`} />
            <DetailRow
              label="Araç"
              value={activeVehicle ? `${activeVehicle.make} ${activeVehicle.model}` : 'Tanımlı değil'}
            />
            <DetailRow label="Batarya kapasitesi" value={formatEnergy(meta.batteryCapacityKwh)} />
            <DetailRow
              label="Tepe güç"
              value={formatPower(meta.ratedPowerKw)}
              hint={meta.ratedPowerKw < meta.connector.powerKw ? 'Aracın sınırı' : undefined}
              last
            />
          </Card>
        </Animated.View>

        <View style={styles.simNote}>
          <Ionicons name="flask-outline" size={13} color={colors.textTertiary} />
          <Text style={styles.simNoteText}>
            Simüle veri · Canlı istasyon bağlantısı backend ile gelecek
          </Text>
        </View>
      </ScrollView>

      {/* Alt eylem cubugu */}
      <View style={[styles.actions, { paddingBottom: spacing.md + tabBarInset }]}>
        <LinearGradient
          pointerEvents="none"
          colors={[withAlpha(colors.background, 0), colors.background]}
          style={styles.actionsFade}
        />
        {isFinished ? (
          <Button
            label="Yolculuğa dön"
            onPress={() => {
              clearSession();
              router.replace('/map');
            }}
            trailingIcon={<Ionicons name="arrow-forward" size={18} color={colors.white} />}
          />
        ) : (
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Şarjı durdur"
            haptic="warning"
            scaleTo={0.97}
            onPress={confirmStop}
            style={styles.stopButton}>
            <View style={styles.stopIcon}>
              <View style={styles.stopSquare} />
            </View>
            <Text style={styles.stopLabel}>Şarjı durdur</Text>
          </AnimatedPressable>
        )}
      </View>
    </SafeAreaView>
  );
}

/** Basliktaki canli gosterge: sarj surerken yayilan bir halka. */
function LiveDot({ mode }: { mode: ChargeRingMode }) {
  const colors = useColors();
  const styles = useStyles();
  const reduceMotion = useReducedMotion();
  const wave = useSharedValue(0);
  const pulsing = mode === 'charging' && !reduceMotion;

  useEffect(() => {
    if (pulsing) {
      wave.set(withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }), -1, false));
    } else {
      cancelAnimation(wave);
      wave.set(0);
    }
  }, [pulsing, wave]);

  const waveStyle = useAnimatedStyle(() => ({
    opacity: pulsing ? 0.55 * (1 - wave.value) : 0,
    transform: [{ scale: 1 + wave.value * 1.6 }],
  }));

  const tone = mode === 'completed' ? colors.success : mode === 'starting' ? colors.warning : colors.success;

  return (
    <View style={styles.liveDot}>
      <Animated.View style={[styles.liveWave, { backgroundColor: tone }, waveStyle]} />
      <View style={[styles.liveCore, { backgroundColor: tone }]} />
    </View>
  );
}

function HeroStatus({ mode }: { mode: ChargeRingMode }) {
  const colors = useColors();
  const styles = useStyles();
  const config = {
    starting: { icon: 'sync-outline' as const, label: 'Bağlanıyor', tone: colors.warningOnDark },
    charging: { icon: 'flash' as const, label: 'Şarj oluyor', tone: colors.primaryOnDark },
    completed: { icon: 'checkmark-circle' as const, label: 'Tamamlandı', tone: colors.successOnDark },
  }[mode];

  return (
    <View style={styles.statusPill}>
      <Ionicons name={config.icon} size={14} color={config.tone} />
      <Text style={[styles.statusText, { color: config.tone }]}>{config.label}</Text>
    </View>
  );
}

function HeroStat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  const styles = useStyles();
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroStatLabel}>{label}</Text>
      <Text style={[styles.heroStatValue, accent && styles.heroStatValueAccent, TABULAR]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Metric({
  icon,
  label,
  value,
  format,
  unit,
  accent = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: number;
  format: (value: number) => string;
  unit?: string;
  accent?: boolean;
}) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <View style={styles.metric}>
      <View style={[styles.metricIcon, accent && styles.metricIconAccent]}>
        <Ionicons name={icon} size={15} color={accent ? colors.white : colors.primaryText} />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.metricValueRow}>
        <AnimatedNumber
          value={value}
          format={format}
          style={[styles.metricValue, accent && styles.metricValueAccent, TABULAR]}
          numberOfLines={1}
        />
        {!!unit && <Text style={styles.metricUnit}>{unit}</Text>}
      </View>
    </View>
  );
}

function DetailRow({
  label,
  value,
  hint,
  last = false,
}: {
  label: string;
  value: string;
  hint?: string;
  last?: boolean;
}) {
  const styles = useStyles();
  return (
    <View style={[styles.detailRow, !last && styles.detailRowDivider]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <View style={styles.detailValueWrap}>
        <Text style={[styles.detailValue, TABULAR]}>{value}</Text>
        {!!hint && <Text style={styles.detailHint}>{hint}</Text>}
      </View>
    </View>
  );
}

/** Oturum yokken: esmerkezli halkalar ve ortada simsek, altinda tek eylem. */
function IdleState({ onFindStation, bottomInset }: { onFindStation: () => void; bottomInset: number }) {
  const colors = useColors();
  const styles = useStyles();
  // Bekleme cizimi canli dursun: kesikli halka cok yavas doner, simsek hafifce
  // suzulur. Yalnizca sekme odaktayken ve "hareketi azalt" kapaliyken.
  const isFocused = useIsFocused();
  const reduceMotion = useReducedMotion();
  const animate = isFocused && !reduceMotion;
  const spin = useSharedValue(0);
  const float = useSharedValue(0);

  useEffect(() => {
    if (!animate) {
      cancelAnimation(spin);
      cancelAnimation(float);
      // Halka gorunmezken sifira doner; yeniden basladiginda 0-360 dongusu dikissiz.
      spin.set(0);
      float.set(withTiming(0, { duration: 250 }));
      return;
    }
    spin.set(withRepeat(withTiming(360, { duration: IDLE_SPIN_MS, easing: Easing.linear }), -1, false));
    float.set(withRepeat(withTiming(1, { duration: IDLE_FLOAT_MS, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [animate, spin, float]);

  const ringStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));
  const boltStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -4 * float.value }] }));

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.idleTitle}>Şarj</Text>
      </View>

      <View style={[styles.idleBody, { paddingBottom: bottomInset }]}>
        <Animated.View entering={FadeInDown.duration(420)} style={styles.idleArt}>
          <Svg width={196} height={196}>
            <Circle cx={98} cy={98} r={96} fill={colors.primarySoft} fillOpacity={0.45} />
            <Circle cx={98} cy={98} r={72} fill={colors.primarySoft} fillOpacity={0.8} />
          </Svg>
          {/* Kesikli halka kendi katmaninda: yalnizca o doner. */}
          <Animated.View style={[styles.idleRing, ringStyle]}>
            <Svg width={196} height={196}>
              <Circle
                cx={98}
                cy={98}
                r={84}
                stroke={colors.primary}
                strokeOpacity={0.25}
                strokeWidth={1.5}
                strokeDasharray="2 6"
                fill="none"
              />
            </Svg>
          </Animated.View>
          <Animated.View style={[styles.idleBolt, boltStyle]}>
            <Ionicons name="flash" size={34} color={colors.white} />
          </Animated.View>
        </Animated.View>

        <Animated.Text entering={FadeInDown.delay(100).duration(420)} style={styles.idleHeadline}>
          Şarj bekleniyor
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(160).duration(420)} style={styles.idleText}>
          Haritadan bir istasyon seç ve şarjı başlat. Anlık güç, enerji ve tutar burada canlı akacak.
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(220).duration(420)} style={styles.idleAction}>
          <Button
            label="İstasyon bul"
            onPress={onFindStation}
            trailingIcon={<Ionicons name="arrow-forward" size={18} color={colors.white} />}
          />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const useStyles = createThemedStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: spacing.sm },

  // --- Baslik
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center' },
  eyebrow: {
    ...typography.captionStrong,
    color: colors.textSecondary,
    letterSpacing: 1.4,
    marginLeft: spacing.sm,
  },
  elapsedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.chip,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  elapsedText: { ...typography.captionStrong, color: colors.text, marginLeft: 6 },
  stationName: { ...typography.h2, fontSize: 26, lineHeight: 32, color: colors.text, marginTop: spacing.md },
  badges: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  badgeGap: { marginLeft: spacing.sm },

  liveDot: { width: 10, height: 10, alignItems: 'center', justifyContent: 'center' },
  liveWave: { position: 'absolute', width: 10, height: 10, borderRadius: 5 },
  liveCore: { width: 8, height: 8, borderRadius: 4 },

  // --- Hero karti
  heroShadow: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    borderRadius: 28,
    backgroundColor: '#0B3B35',
    shadowColor: '#062420',
    shadowOpacity: 0.28,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  hero: { borderRadius: 28, overflow: 'hidden', padding: spacing.xl },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.chip,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  statusText: { ...typography.captionStrong, marginLeft: 6 },
  heroPower: { flexDirection: 'row', alignItems: 'baseline' },
  heroPowerValue: { ...typography.h3, color: colors.white, marginLeft: 4 },
  heroPowerUnit: { ...typography.caption, color: ON_DARK_MUTED, marginLeft: 3 },

  ringWrap: { alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.md },
  percentRow: { flexDirection: 'row', alignItems: 'flex-start' },
  percent: {
    fontSize: 68,
    lineHeight: 78,
    fontFamily: fontFamilies.displayExtraBold,
    color: colors.white,
    letterSpacing: -2,
  },
  percentSign: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '700',
    color: ON_DARK_MUTED,
    marginTop: 10,
    marginLeft: 2,
  },
  ringCaption: {
    ...typography.captionStrong,
    color: ON_DARK_MUTED,
    letterSpacing: 2,
    marginTop: spacing.xs,
  },

  heroStats: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: spacing.md,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.10)',
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroDivider: { width: 1, backgroundColor: 'rgba(255, 255, 255, 0.10)' },
  heroStatLabel: { ...typography.caption, color: ON_DARK_MUTED },
  heroStatValue: { ...typography.h3, fontSize: 20, lineHeight: 26, color: colors.white, marginTop: 4 },
  heroStatValueAccent: { color: colors.successOnDark },

  // --- Metrikler
  metricsCard: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    paddingVertical: spacing.lg,
  },
  metric: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.xs },
  metricDivider: { width: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  metricIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricIconAccent: { backgroundColor: colors.primaryStrong },
  metricLabel: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
  metricValueRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 2 },
  metricValue: { ...typography.h3, fontSize: 19, lineHeight: 24, color: colors.text },
  metricValueAccent: { color: colors.primaryText },
  metricUnit: { ...typography.caption, color: colors.textSecondary, marginLeft: 3 },

  // --- Kartlar
  sectionCard: { marginHorizontal: spacing.lg, marginTop: spacing.lg },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  cardTitle: { ...typography.bodyStrong, color: colors.text },
  cardMeta: { ...typography.caption, color: colors.textSecondary },
  cardCaption: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.md, lineHeight: 17 },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  detailRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  detailLabel: { ...typography.body, color: colors.textSecondary },
  detailValueWrap: { alignItems: 'flex-end' },
  detailValue: { ...typography.bodyStrong, color: colors.text },
  detailHint: { ...typography.caption, color: colors.textTertiary, marginTop: 1 },

  simNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  simNoteText: { ...typography.caption, color: colors.textTertiary, marginLeft: 6 },

  // --- Alt cubuk
  actions: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
  },
  actionsFade: { position: 'absolute', left: 0, right: 0, top: -24, height: 24 },
  stopButton: {
    height: 56,
    borderRadius: radius.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.dangerSoft,
  },
  stopIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopSquare: { width: 9, height: 9, borderRadius: 2, backgroundColor: colors.dangerText },
  stopLabel: { ...typography.bodyStrong, color: colors.dangerText, marginLeft: spacing.sm },

  // --- Bos durum
  idleTitle: { ...typography.h2, color: colors.text },
  idleBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxl },
  idleArt: { width: 196, height: 196, alignItems: 'center', justifyContent: 'center' },
  idleRing: { position: 'absolute', top: 0, left: 0 },
  idleBolt: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idleHeadline: { ...typography.h2, color: colors.text, marginTop: spacing.xxl, textAlign: 'center' },
  idleText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
    maxWidth: 320,
  },
  idleAction: { marginTop: spacing.xxl, alignSelf: 'stretch' },
}));
