import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Button, Card, EmptyState, ProgressRing } from '@/components';
import { useCreateHistoryEntry } from '@/queries/history';
import { useSessionStore } from '@/store/session';
import { colors, radius, spacing, typography } from '@/theme';
import { formatDuration, formatEnergy, formatPower, formatPrice } from '@/utils/format';
import { haptics } from '@/utils/haptics';

/** Grafikte tutulan en fazla ornek sayisi. */
const HISTORY_LIMIT = 40;
/** Simulasyondaki ortalama batarya kapasitesi; kalan sure tahmininde kullanilir. */
const ASSUMED_BATTERY_KWH = 60;

export default function ChargingScreen() {
  const router = useRouter();
  const session = useSessionStore((state) => state.session);
  const meta = useSessionStore((state) => state.meta);
  const elapsedSeconds = useSessionStore((state) => state.elapsedSeconds);
  const stopSession = useSessionStore((state) => state.stop);
  const clearSession = useSessionStore((state) => state.clear);

  const [powerHistory, setPowerHistory] = useState<number[]>([]);
  const lastSampleRef = useRef<number | undefined>(undefined);
  const createHistoryEntry = useCreateHistoryEntry();
  const archivedSessionIdRef = useRef<string | undefined>(undefined);
  const wasFinishedRef = useRef(false);

  const battery = Math.round(session?.batteryPercent ?? 0);
  const isFinished = session?.status === 'COMPLETED';
  const isCharging = session?.status === 'CHARGING';

  const pulse = useSharedValue(1);

  useEffect(() => {
    if (isCharging) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 700, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      pulse.value = withTiming(1, { duration: 200 });
    }
  }, [isCharging, pulse]);

  // Sarj tam bu render'da bitmisse (ve daha once bildirmediysek) basari titresimi ver.
  useEffect(() => {
    if (isFinished && !wasFinishedRef.current) {
      wasFinishedRef.current = true;
      haptics.success();
    } else if (!isFinished) {
      wasFinishedRef.current = false;
    }
  }, [isFinished]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  useEffect(() => {
    if (!session || session.status !== 'CHARGING') return;
    if (lastSampleRef.current === session.energyKwh) return;

    lastSampleRef.current = session.energyKwh;
    setPowerHistory((prev) => [...prev, session.powerKw].slice(-HISTORY_LIMIT));
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
    return (
      <SafeAreaView edges={['top']} style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Şarj</Text>
        </View>
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="flash-outline"
            title="Aktif şarj oturumu yok"
            description="Haritadan bir istasyon seç, soketi belirle ve şarjı başlat. Anlık güç, enerji ve tutar burada canlı görünecek."
            action={<Button label="İstasyon bul" onPress={() => router.replace('/map')} />}
          />
        </View>
      </SafeAreaView>
    );
  }

  const isStarting = session.status === 'STARTING';

  const remainingKwh = ((100 - battery) / 100) * ASSUMED_BATTERY_KWH;
  const remainingMinutes =
    session.powerKw > 0 ? Math.round((remainingKwh / session.powerKw) * 60) : null;

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>{isFinished ? 'Şarj tamamlandı' : 'Aktif şarj'}</Text>
            {isCharging && (
              <Animated.View style={pulseStyle}>
                <Ionicons name="flash" size={18} color={colors.primary} />
              </Animated.View>
            )}
          </View>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {meta.stationName} · {meta.connectorLabel}
          </Text>
        </View>

        <View style={styles.hero}>
          <ProgressRing progress={battery} color={isFinished ? colors.success : colors.primary}>
            <Text style={styles.battery}>{battery}%</Text>
            <Text style={styles.batteryLabel}>batarya</Text>
          </ProgressRing>

          {isStarting ? (
            <Text style={styles.statusLine}>İstasyonla el sıkışılıyor…</Text>
          ) : isFinished ? (
            <Text style={styles.statusLine}>Oturum kapandı</Text>
          ) : remainingMinutes != null ? (
            <Text style={styles.statusLine}>Tahmini kalan {remainingMinutes} dk</Text>
          ) : null}
        </View>

        <View style={styles.metrics}>
          <Metric index={0} label="Anlık güç" value={formatPower(session.powerKw)} />
          <Metric index={1} label="Alınan enerji" value={formatEnergy(session.energyKwh)} />
          <Metric index={2} label="Geçen süre" value={formatDuration(elapsedSeconds)} />
          <Metric index={3} label="Tahmini tutar" value={formatPrice(session.cost)} highlight />
        </View>

        {powerHistory.length > 1 && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <Card style={styles.chartCard}>
              <Text style={styles.chartTitle}>Güç eğrisi</Text>
              <PowerChart values={powerHistory} peak={meta.ratedPowerKw} />
              <Text style={styles.chartCaption}>
                Batarya doldukça güç düşer; bu normaldir.
              </Text>
            </Card>
          </Animated.View>
        )}

        <View style={styles.notice}>
          <Ionicons name="flask-outline" size={16} color={colors.warning} />
          <Text style={styles.noticeText}>
            Simüle veri. Gerçekte bu değerler WebSocket üzerinden istasyondan gelecek.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        {isFinished ? (
          <Button label="Yolculuğa dön" onPress={() => { clearSession(); router.replace('/map'); }} />
        ) : (
          <Button label="Şarjı Durdur" variant="danger" onPress={stopSession} />
        )}
      </View>
    </SafeAreaView>
  );
}

function Metric({
  label,
  value,
  index,
  highlight = false,
}: {
  label: string;
  value: string;
  index: number;
  highlight?: boolean;
}) {
  return (
    <Animated.View
      style={styles.metricTile}
      entering={FadeInDown.delay(index * 60)
        .duration(280)}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, highlight && styles.metricValueHighlight]}>{value}</Text>
    </Animated.View>
  );
}

/** Bagimlilik eklemeden basit bir sutun grafigi. */
function PowerChart({ values, peak }: { values: number[]; peak: number }) {
  const max = Math.max(peak, ...values) || 1;

  return (
    <View style={styles.chart} accessibilityRole="image" accessibilityLabel="Güç eğrisi grafiği">
      {values.map((value, index) => (
        <View
          key={index}
          style={[styles.chartBar, { height: `${Math.max(4, (value / max) * 100)}%` }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxl },

  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { ...typography.h2, color: colors.text, marginRight: spacing.sm },
  headerSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },

  emptyWrap: { flex: 1, justifyContent: 'center' },

  hero: { alignItems: 'center', paddingHorizontal: spacing.xl, marginTop: spacing.xl },
  battery: { fontSize: 52, lineHeight: 58, fontWeight: '800', color: colors.text },
  batteryLabel: {
    ...typography.captionStrong,
    color: colors.textSecondary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: spacing.xs,
  },
  statusLine: { ...typography.body, color: colors.textSecondary, marginTop: spacing.lg },

  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xl,
  },
  metricTile: {
    width: '50%',
    paddingVertical: spacing.md,
  },
  metricLabel: { ...typography.caption, color: colors.textSecondary },
  metricValue: { ...typography.h3, color: colors.text, marginTop: 2 },
  metricValueHighlight: { color: colors.primaryDark },

  chartCard: { marginHorizontal: spacing.xl, marginTop: spacing.lg },
  chartTitle: { ...typography.captionStrong, color: colors.textSecondary },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    height: 90,
    marginTop: spacing.md,
  },
  chartBar: {
    flex: 1,
    // Az ornekle cubuklar devasa gorunmesin.
    maxWidth: 8,
    marginHorizontal: 1,
    borderRadius: 2,
    backgroundColor: colors.primary,
    opacity: 0.75,
  },
  chartCaption: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.md },

  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.badge,
    backgroundColor: colors.warningSoft,
  },
  noticeText: { ...typography.caption, color: colors.text, flex: 1, marginLeft: spacing.sm },

  actions: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
});
