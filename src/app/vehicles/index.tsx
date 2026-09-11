import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOutLeft, LinearTransition } from 'react-native-reanimated';

import { AnimatedPressable, Button, ConnectorBadge, EmptyState } from '@/components';
import { useActivateVehicle, useRemoveVehicle, useVehicles } from '@/queries/vehicles';
import { colors, radius, shadows, spacing, typography } from '@/theme';

/** Araclarim (spec bolum 14). */
export default function VehiclesScreen() {
  const router = useRouter();
  const { data: vehicles, isLoading } = useVehicles();
  const activate = useActivateVehicle();
  const remove = useRemoveVehicle();

  const confirmRemove = (id: string, label: string) => {
    Alert.alert('Aracı sil', `${label} silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => remove.mutate(id) },
    ]);
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Geri"
            hitSlop={10}
            haptic="tap"
            onPress={() => router.back()}
            style={styles.headerButton}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </AnimatedPressable>
          <Text style={styles.headerTitle}>Araçlarım</Text>
          {/* Basligi ortalamak icin denge bosluğu; buton gibi gorunmemeli. */}
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      {isLoading ? (
        <View style={styles.emptyWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !vehicles || vehicles.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="car-sport-outline"
            title="Henüz araç yok"
            description="Aracını ekleyince soket uyumluluğuna göre istasyon filtreleyebilir, rota önerilerini araca göre alabilirsin."
            action={<Button label="Araç ekle" onPress={() => router.push('/vehicles/add')} />}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          <Text style={styles.hint}>
            Aktif araç, &quot;Aracıma uygun&quot; filtresinde ve rota önerilerinde kullanılır.
          </Text>

          {vehicles.map((vehicle, index) => {
            const isActive = vehicle.isActive;
            return (
              <Animated.View
                key={vehicle.id}
                entering={FadeInDown.delay(index * 60).duration(300)}
                exiting={FadeOutLeft.duration(200)}
                layout={LinearTransition.duration(220)}>
                <AnimatedPressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  haptic="selection"
                  scaleTo={0.98}
                  onPress={() => activate.mutate(vehicle.id)}
                  style={({ pressed }) => [
                    styles.card,
                    isActive && styles.cardActive,
                    pressed && styles.cardPressed,
                  ]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardTitleWrap}>
                      <Text style={styles.cardTitle}>
                        {vehicle.make} {vehicle.model}
                      </Text>
                      <Text style={styles.cardYear}>{vehicle.modelYear}</Text>
                    </View>

                    {isActive ? (
                      <Animated.View
                        entering={FadeInDown.duration(200)}
                        style={styles.activeBadge}>
                        <Ionicons name="checkmark" size={13} color={colors.white} />
                        <Text style={styles.activeBadgeText}>Aktif</Text>
                      </Animated.View>
                    ) : (
                      <AnimatedPressable
                        accessibilityRole="button"
                        accessibilityLabel={`${vehicle.make} ${vehicle.model} aracını sil`}
                        hitSlop={10}
                        haptic="warning"
                        onPress={() => confirmRemove(vehicle.id, `${vehicle.make} ${vehicle.model}`)}>
                        <Ionicons name="trash-outline" size={18} color={colors.textTertiary} />
                      </AnimatedPressable>
                    )}
                  </View>

                  <View style={styles.specs}>
                    <Spec label="Batarya" value={`${vehicle.batteryCapacityKwh} kWh`} />
                    <Spec label="AC" value={`${vehicle.maxAcKw} kW`} />
                    <Spec label="DC" value={`${vehicle.maxDcKw} kW`} />
                    <Spec
                      label="Tüketim"
                      value={`${vehicle.averageConsumptionKwhPer100Km} kWh/100km`}
                    />
                  </View>

                  <View style={styles.connectors}>
                    {vehicle.connectors.map((type) => (
                      <ConnectorBadge key={type} type={type} style={styles.connectorBadge} />
                    ))}
                  </View>
                </AnimatedPressable>
              </Animated.View>
            );
          })}
        </ScrollView>
      )}

      {!!vehicles && vehicles.length > 0 && (
        <SafeAreaView edges={['bottom']} style={[styles.actions, shadows.sheet]}>
          <Button label="Araç ekle" onPress={() => router.push('/vehicles/add')} />
        </SafeAreaView>
      )}
    </View>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.spec}>
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={styles.specValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
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
  headerTitle: { ...typography.h3, color: colors.text },
  headerSpacer: { width: 40, height: 40 },

  emptyWrap: { flex: 1, justifyContent: 'center' },
  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  hint: { ...typography.caption, color: colors.textSecondary, marginVertical: spacing.lg },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardActive: { borderColor: colors.primary },
  cardPressed: { backgroundColor: colors.surfaceMuted },

  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  cardTitleWrap: { flex: 1 },
  cardTitle: { ...typography.h3, color: colors.text },
  cardYear: { ...typography.caption, color: colors.textSecondary, marginTop: 1 },

  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.chip,
    backgroundColor: colors.primary,
  },
  activeBadgeText: { ...typography.caption, color: colors.white, fontWeight: '700', marginLeft: 2 },

  specs: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.lg },
  spec: { width: '50%', paddingVertical: spacing.xs },
  specLabel: { ...typography.caption, color: colors.textSecondary },
  specValue: { ...typography.bodyStrong, color: colors.text },

  connectors: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md },
  connectorBadge: { marginRight: spacing.sm, marginTop: spacing.xs },

  actions: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
});
