import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, EmptyState } from '@/components';
import { useSessionStore } from '@/store/session';
import { colors, radius, spacing, typography } from '@/theme';
import { formatDuration, formatEnergy, formatPower, formatPrice } from '@/utils/format';

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

  useEffect(() => {
    if (!session || session.status !== 'CHARGING') return;
    if (lastSampleRef.current === session.energyKwh) return;

    lastSampleRef.current = session.energyKwh;
    setPowerHistory((prev) => [...prev, session.powerKw].slice(-HISTORY_LIMIT));
  }, [session]);

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

  const battery = Math.round(session.batteryPercent ?? 0);
  const isFinished = session.status === 'COMPLETED';
  const isStarting = session.status === 'STARTING';

  const remainingKwh = ((100 - battery) / 100) * ASSUMED_BATTERY_KWH;
  const remainingMinutes =
    session.powerKw > 0 ? Math.round((remainingKwh / session.powerKw) * 60) : null;

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{isFinished ? 'Şarj tamamlandı' : 'Aktif şarj'}</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {meta.stationName} · {meta.connectorLabel}
          </Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.battery}>{battery}%</Text>
          <Text style={styles.batteryLabel}>Batarya doluluk</Text>

          <View style={styles.batteryTrack}>
            <View style={[styles.batteryFill, { width: `${battery}%` }]} />
          </View>

          {isStarting ? (
            <Text style={styles.statusLine}>İstasyonla el sıkışılıyor…</Text>
          ) : isFinished ? (
            <Text style={styles.statusLine}>Oturum kapandı</Text>
          ) : remainingMinutes != null ? (
            <Text style={styles.statusLine}>Tahmini kalan {remainingMinutes} dk</Text>
          ) : null}
        </View>

        <View style={styles.metrics}>
          <Metric label="Anlık güç" value={formatPower(session.powerKw)} />
          <Metric label="Alınan enerji" value={formatEnergy(session.energyKwh)} />
          <Metric label="Geçen süre" value={formatDuration(elapsedSeconds)} />
          <Metric label="Tahmini tutar" value={formatPrice(session.cost)} highlight />
        </View>

        {powerHistory.length > 1 && (
          <Card style={styles.chartCard}>
            <Text style={styles.chartTitle}>Güç eğrisi</Text>
            <PowerChart values={powerHistory} peak={meta.ratedPowerKw} />
            <Text style={styles.chartCaption}>
              Batarya doldukça güç düşer; bu normaldir.
            </Text>
          </Card>
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
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.metricTile}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, highlight && styles.metricValueHighlight]}>{value}</Text>
    </View>
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
  headerTitle: { ...typography.h2, color: colors.text },
  headerSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },

  emptyWrap: { flex: 1, justifyContent: 'center' },

  hero: { alignItems: 'center', paddingHorizontal: spacing.xl, marginTop: spacing.xxl },
  battery: { fontSize: 64, lineHeight: 70, fontWeight: '800', color: colors.text },
  batteryLabel: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  batteryTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primarySoft,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  batteryFill: { height: '100%', borderRadius: 4, backgroundColor: colors.primary },
  statusLine: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md },

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
