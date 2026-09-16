import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  AnimatedPressable,
  Button,
  Card,
  ConnectorBadge,
  DetailSkeleton,
  EmptyState,
  FilterChip,
  PowerBadge,
  SuccessOverlay,
} from '@/components';
import { useCreateReservation, useSetReservationStatus } from '@/queries/reservations';
import { useStation } from '@/queries/stations';
import { createThemedStyles, radius, shadows, spacing, typography, useColors } from '@/theme';
import { RESERVATION_GRACE_MINUTES, currentTypeOf } from '@/types/domain';
import { formatTime } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { scheduleReservationReminders } from '@/utils/notifications';

/** Hizli rezervasyon secenekleri (spec bolum 10). */
const START_OPTIONS = [
  { id: 'now', label: 'Şimdi', minutes: 0 },
  { id: 'in15', label: '+15 dk', minutes: 15 },
  { id: 'in30', label: '+30 dk', minutes: 30 },
  { id: 'in60', label: '+1 saat', minutes: 60 },
] as const;

const DURATION_OPTIONS = [30, 45, 60, 90];

export default function NewReservationScreen() {
  const colors = useColors();
  const styles = useStyles();
  const { stationId, connectorId } = useLocalSearchParams<{
    stationId: string;
    connectorId: string;
  }>();
  const router = useRouter();
  const createReservation = useCreateReservation();
  const setStatus = useSetReservationStatus();

  const [startId, setStartId] = useState<string>('in15');
  const [duration, setDuration] = useState(45);
  const [error, setError] = useState<string>();
  const [createdId, setCreatedId] = useState<string>();

  const { data: station, isLoading } = useStation(stationId);
  const connector = station?.connectors.find((c) => c.id === connectorId);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.root}>
        <Header onClose={() => router.back()} />
        <DetailSkeleton />
      </SafeAreaView>
    );
  }

  if (!station || !connector) {
    return (
      <SafeAreaView style={styles.root}>
        <Header onClose={() => router.back()} />
        <EmptyState
          icon="calendar-outline"
          title="Soket bulunamadı"
          description="Rezerve etmek istediğin soket artık mevcut değil."
          action={<Button label="Geri dön" onPress={() => router.back()} />}
        />
      </SafeAreaView>
    );
  }

  const option = START_OPTIONS.find((o) => o.id === startId) ?? START_OPTIONS[1];
  const startsAt = new Date(Date.now() + option.minutes * 60_000);

  const handleReserve = () => {
    setError(undefined);
    createReservation.mutate(
      {
        stationId: station.id,
        connectorId: connector.id,
        startsAt: startsAt.toISOString(),
        durationMinutes: duration,
      },
      {
        onSuccess: (reservation) => {
          // Sunucu onayini simule ediyoruz: gercekte bu adim backend'in
          // kendi is kurallarina (soket musaitligi vb.) gore olur.
          setStatus.mutate(
            { id: reservation.id, status: 'CONFIRMED' },
            {
              onSuccess: () => {
                void scheduleReservationReminders(reservation);
              },
              onSettled: () => {
                // Yonlendirmeyi onay ekrani bitirince yapiyoruz; basari
                // titresimini de o caliyor. setStatus hata verse bile
                // rezervasyon olusmus durumda, mesaj dogru kaliyor.
                setCreatedId(reservation.id);
              },
            },
          );
        },
        onError: (err) => {
          haptics.error();
          setError(err instanceof Error ? err.message : 'Rezervasyon oluşturulamadı');
        },
      },
    );
  };

  const submitting = createReservation.isPending || setStatus.isPending;

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']}>
        <Header onClose={() => router.back()} />
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Rezervasyon</Text>
        <Text style={styles.subtitle}>Soketi sana ayıralım.</Text>

        <Animated.View entering={FadeInDown.duration(300)}>
          <Card style={styles.card}>
            <Text style={styles.stationName}>{station.name}</Text>
            <View style={styles.badges}>
              <ConnectorBadge type={connector.type} />
              <PowerBadge
                currentType={currentTypeOf(connector)}
                powerKw={connector.powerKw}
                style={styles.badgeGap}
              />
            </View>
          </Card>
        </Animated.View>

        <Text style={styles.sectionTitle}>Ne zaman?</Text>
        <View style={styles.chips}>
          {START_OPTIONS.map((o) => (
            <FilterChip
              key={o.id}
              label={o.label}
              selected={startId === o.id}
              onPress={() => setStartId(o.id)}
              style={styles.chip}
            />
          ))}
        </View>
        <Text style={styles.hint}>Başlangıç: {formatTime(startsAt.toISOString())}</Text>

        <Text style={styles.sectionTitle}>Ne kadar sürecek?</Text>
        <View style={styles.chips}>
          {DURATION_OPTIONS.map((minutes) => (
            <FilterChip
              key={minutes}
              label={`${minutes} dk`}
              selected={duration === minutes}
              onPress={() => setDuration(minutes)}
              style={styles.chip}
            />
          ))}
        </View>

        <View style={styles.policy}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.policyText}>
            Soket, başlangıç saatinden sonra {RESERVATION_GRACE_MINUTES} dakika sana ayrılır. Bu
            süre içinde gelmezsen rezervasyon düşer. İptal ücretsizdir.
          </Text>
        </View>

        {!!error && (
          <Animated.View entering={FadeInDown.duration(220)} style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.dangerText} />
            <Text style={styles.errorText}>{error}</Text>
          </Animated.View>
        )}
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={[styles.actions, shadows.sheet]}>
        <Button label="Rezerve Et" loading={submitting} onPress={handleReserve} />
      </SafeAreaView>

      {createdId && (
        <SuccessOverlay
          label="Rezervasyon oluşturuldu"
          onDone={() => router.replace({ pathname: '/booking/[id]', params: { id: createdId } })}
        />
      )}
    </View>
  );
}

function Header({ onClose }: { onClose: () => void }) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <View style={styles.header}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel="Kapat"
        hitSlop={10}
        haptic="tap"
        onPress={onClose}
        style={styles.headerButton}>
        <Ionicons name="close" size={22} color={colors.text} />
      </AnimatedPressable>
    </View>
  );
}

const useStyles = createThemedStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.background },
  loadingWrap: { flex: 1, justifyContent: 'center' },
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
  title: { ...typography.h1, color: colors.text, marginTop: spacing.lg },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },

  card: { marginTop: spacing.xl },
  stationName: { ...typography.h3, color: colors.text },
  badges: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  badgeGap: { marginLeft: spacing.sm },

  sectionTitle: { ...typography.h3, color: colors.text, marginTop: spacing.xxl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md },
  chip: { marginRight: spacing.sm, marginBottom: spacing.sm },
  hint: { ...typography.caption, color: colors.textSecondary },

  policy: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.xxl,
    padding: spacing.lg,
    borderRadius: radius.badge,
    backgroundColor: colors.surfaceMuted,
  },
  policyText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    marginLeft: spacing.sm,
    lineHeight: 18,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.badge,
    backgroundColor: colors.dangerSoft,
  },
  errorText: { ...typography.caption, color: colors.dangerText, flex: 1, marginLeft: spacing.sm },

  actions: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
}));
