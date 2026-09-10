import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, ConnectorBadge, EmptyState, FilterChip, PowerBadge } from '@/components';
import { findMockStation } from '@/mocks/stations';
import { useReservationStore } from '@/store/reservations';
import { colors, radius, shadows, spacing, typography } from '@/theme';
import { RESERVATION_GRACE_MINUTES, currentTypeOf } from '@/types/domain';
import { formatTime } from '@/utils/format';

/** Hizli rezervasyon secenekleri (spec bolum 10). */
const START_OPTIONS = [
  { id: 'now', label: 'Şimdi', minutes: 0 },
  { id: 'in15', label: '+15 dk', minutes: 15 },
  { id: 'in30', label: '+30 dk', minutes: 30 },
  { id: 'in60', label: '+1 saat', minutes: 60 },
] as const;

const DURATION_OPTIONS = [30, 45, 60, 90];

export default function NewReservationScreen() {
  const { stationId, connectorId } = useLocalSearchParams<{
    stationId: string;
    connectorId: string;
  }>();
  const router = useRouter();
  const create = useReservationStore((state) => state.create);
  const confirm = useReservationStore((state) => state.confirm);

  const [startId, setStartId] = useState<string>('in15');
  const [duration, setDuration] = useState(45);
  const [submitting, setSubmitting] = useState(false);

  const station = findMockStation(stationId);
  const connector = station?.connectors.find((c) => c.id === connectorId);

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

  const handleReserve = async () => {
    setSubmitting(true);
    const reservation = create(station, connector, startsAt, duration);

    // Sunucu onayini simule ediyoruz; gercekte POST /reservations yaniti beklenir.
    setTimeout(() => {
      confirm(reservation.id);
      setSubmitting(false);
      router.replace({ pathname: '/booking/[id]', params: { id: reservation.id } });
    }, 900);
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']}>
        <Header onClose={() => router.back()} />
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Rezervasyon</Text>
        <Text style={styles.subtitle}>Soketi sana ayıralım.</Text>

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
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={[styles.actions, shadows.sheet]}>
        <Button label="Rezerve Et" loading={submitting} onPress={handleReserve} />
      </SafeAreaView>
    </View>
  );
}

function Header({ onClose }: { onClose: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Kapat"
        hitSlop={10}
        onPress={onClose}
        style={styles.headerButton}>
        <Ionicons name="close" size={22} color={colors.text} />
      </Pressable>
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

  actions: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
});
