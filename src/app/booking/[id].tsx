import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvailabilityBadge, Button, Card, EmptyState } from '@/components';
import { useReservationStore } from '@/store/reservations';
import { colors, radius, spacing, typography } from '@/theme';
import {
  RESERVATION_GRACE_MINUTES,
  effectiveReservationStatus,
  reservationStatusLabels,
  type ReservationStatus,
} from '@/types/domain';
import { formatDate, formatMinutes, formatTime } from '@/utils/format';

/** Durum -> rozet tonu. Rozet paleti soket durumlariyla ortak. */
const STATUS_TONE: Record<ReservationStatus, 'AVAILABLE' | 'OCCUPIED' | 'FAULTED' | 'UNKNOWN'> = {
  DRAFT: 'UNKNOWN',
  PENDING: 'OCCUPIED',
  CONFIRMED: 'AVAILABLE',
  ARRIVED: 'AVAILABLE',
  EXPIRED: 'FAULTED',
  CANCELLED: 'UNKNOWN',
};

export default function ReservationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const reservation = useReservationStore((state) => state.findById(id));
  const cancel = useReservationStore((state) => state.cancel);
  const markArrived = useReservationStore((state) => state.markArrived);

  // Kalan sure geri saysin diye dakikada bir yeniden ciziyoruz.
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(timer);
  }, []);

  if (!reservation) {
    return (
      <SafeAreaView style={styles.root}>
        <Header onBack={() => router.back()} />
        <EmptyState
          icon="calendar-outline"
          title="Rezervasyon bulunamadı"
          description="Bu rezervasyon silinmiş olabilir."
          action={<Button label="Geri dön" onPress={() => router.back()} />}
        />
      </SafeAreaView>
    );
  }

  const status = effectiveReservationStatus(reservation);
  const startsAt = new Date(reservation.startsAt);
  const deadline = new Date(startsAt.getTime() + RESERVATION_GRACE_MINUTES * 60_000);
  const minutesToStart = Math.round((startsAt.getTime() - Date.now()) / 60_000);
  const isOpen = status === 'PENDING' || status === 'CONFIRMED';

  const confirmCancel = () =>
    Alert.alert('Rezervasyonu iptal et', 'Bu rezervasyon iptal edilsin mi?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'İptal et', style: 'destructive', onPress: () => cancel(reservation.id) },
    ]);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']}>
        <Header onBack={() => router.back()} />
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AvailabilityBadge
          status={STATUS_TONE[status]}
          label={reservationStatusLabels[status]}
          style={styles.statusBadge}
        />

        <Text style={styles.station}>{reservation.stationName}</Text>
        <Text style={styles.connector}>{reservation.connectorLabel}</Text>

        {isOpen && (
          <Text style={styles.countdown}>
            {minutesToStart > 0
              ? `${minutesToStart} dakika içinde başlıyor`
              : `Başladı · ${formatTime(deadline.toISOString())}'e kadar bekliyor`}
          </Text>
        )}

        <Card style={styles.card}>
          <Row label="Tarih" value={formatDate(reservation.startsAt)} />
          <Row label="Başlangıç" value={formatTime(reservation.startsAt)} />
          <Row label="Süre" value={formatMinutes(reservation.durationMinutes)} />
          <Row
            label="Bekleme sınırı"
            value={`${formatTime(deadline.toISOString())} (${RESERVATION_GRACE_MINUTES} dk)`}
            last
          />
        </Card>

        {status === 'EXPIRED' && (
          <View style={styles.warnBox}>
            <Ionicons name="time-outline" size={16} color={colors.danger} />
            <Text style={styles.warnText}>
              Bekleme süresi doldu ve soket serbest bırakıldı. Yeni bir rezervasyon
              oluşturabilirsin.
            </Text>
          </View>
        )}

        {status === 'ARRIVED' && (
          <View style={styles.okBox}>
            <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
            <Text style={styles.okText}>
              Geldiğini bildirdin. Soketi takıp şarjı başlatabilirsin.
            </Text>
          </View>
        )}

        <View style={styles.notice}>
          <Ionicons name="flask-outline" size={16} color={colors.warning} />
          <Text style={styles.noticeText}>
            Rezervasyon onayı simüle ediliyor. Gerçekte soketi başkası kapmış olabilir ve sunucu
            reddedebilir.
          </Text>
        </View>
      </ScrollView>

      {isOpen && (
        <SafeAreaView edges={['bottom']} style={styles.actions}>
          <Button label="Geldim" onPress={() => markArrived(reservation.id)} />
          <Button
            label="Rezervasyonu iptal et"
            variant="ghost"
            style={styles.cancelButton}
            onPress={confirmCancel}
          />
        </SafeAreaView>
      )}
    </View>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Geri"
        hitSlop={10}
        onPress={onBack}
        style={styles.headerButton}>
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </Pressable>
    </View>
  );
}

function Row({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: radius.chip,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.huge },
  statusBadge: { marginTop: spacing.lg },
  station: { ...typography.h1, color: colors.text, marginTop: spacing.md },
  connector: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  countdown: { ...typography.bodyStrong, color: colors.primaryDark, marginTop: spacing.md },

  card: { marginTop: spacing.xl, paddingVertical: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { ...typography.body, color: colors.textSecondary },
  rowValue: { ...typography.bodyStrong, color: colors.text },

  warnBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: radius.badge,
    backgroundColor: colors.dangerSoft,
  },
  warnText: { ...typography.caption, color: colors.text, flex: 1, marginLeft: spacing.sm },
  okBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: radius.badge,
    backgroundColor: colors.successSoft,
  },
  okText: { ...typography.caption, color: colors.text, flex: 1, marginLeft: spacing.sm },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.badge,
    backgroundColor: colors.warningSoft,
  },
  noticeText: { ...typography.caption, color: colors.text, flex: 1, marginLeft: spacing.sm },

  actions: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  cancelButton: { marginTop: spacing.xs },
});
