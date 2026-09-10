import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components';
import { useVehicleStore } from '@/store/vehicles';
import { colors, radius, spacing, typography } from '@/theme';
import { connectorLabels } from '@/types/domain';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/** Spec bolum 4'teki profil menusu. Yapilmamis olanlar gorunur ama pasif. */
const MENU: { icon: IoniconName; label: string; href?: string }[] = [
  { icon: 'car-sport-outline', label: 'Araçlarım', href: '/vehicles' },
  { icon: 'card-outline', label: 'Ödeme yöntemleri' },
  { icon: 'heart-outline', label: 'Favoriler' },
  { icon: 'notifications-outline', label: 'Bildirimler' },
  { icon: 'pricetag-outline', label: 'Kampanyalar' },
  { icon: 'help-buoy-outline', label: 'Yardım ve destek' },
  { icon: 'settings-outline', label: 'Ayarlar' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const vehicles = useVehicleStore((state) => state.vehicles);
  const activeVehicleId = useVehicleStore((state) => state.activeVehicleId);
  const activeVehicle = vehicles.find((v) => v.id === activeVehicleId);

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Profil</Text>

        <Card style={styles.vehicleCard}>
          <Text style={styles.vehicleCardLabel}>Aktif araç</Text>

          {activeVehicle ? (
            <>
              <Text style={styles.vehicleName}>
                {activeVehicle.make} {activeVehicle.model}
              </Text>
              <Text style={styles.vehicleSpecs}>
                {activeVehicle.batteryCapacityKwh} kWh ·{' '}
                {activeVehicle.connectors.map((c) => connectorLabels[c]).join(', ')}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.vehicleEmpty}>Henüz araç eklemedin</Text>
              <Text style={styles.vehicleSpecs}>
                Araç ekleyince uyumlu istasyonları filtreleyebilirsin.
              </Text>
            </>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/vehicles')}
            style={({ pressed }) => [styles.vehicleAction, pressed && styles.vehicleActionPressed]}>
            <Text style={styles.vehicleActionText}>
              {activeVehicle ? 'Araçları yönet' : 'Araç ekle'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primaryDark} />
          </Pressable>
        </Card>

        <View style={styles.menu}>
          {MENU.map((item, index) => {
            const enabled = !!item.href;
            return (
              <Pressable
                key={item.label}
                accessibilityRole="button"
                accessibilityState={{ disabled: !enabled }}
                disabled={!enabled}
                onPress={() => item.href && router.push(item.href as never)}
                style={({ pressed }) => [
                  styles.menuRow,
                  index < MENU.length - 1 && styles.menuRowDivider,
                  pressed && enabled && styles.menuRowPressed,
                ]}>
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={enabled ? colors.text : colors.textTertiary}
                />
                <Text style={[styles.menuLabel, !enabled && styles.menuLabelDisabled]}>
                  {item.label}
                </Text>

                {enabled ? (
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                ) : (
                  <Text style={styles.soon}>yakında</Text>
                )}
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.version}>TORA WATT · v0.1.0 · dev build</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  title: { ...typography.h2, color: colors.text, paddingTop: spacing.sm },

  vehicleCard: { marginTop: spacing.xl },
  vehicleCardLabel: { ...typography.captionStrong, color: colors.primary, letterSpacing: 1 },
  vehicleName: { ...typography.h3, color: colors.text, marginTop: spacing.sm },
  vehicleEmpty: { ...typography.h3, color: colors.text, marginTop: spacing.sm },
  vehicleSpecs: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  vehicleAction: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.badge,
    backgroundColor: colors.primarySoft,
  },
  vehicleActionPressed: { backgroundColor: '#DCE6FF' },
  vehicleActionText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.primaryDark,
    marginRight: spacing.xs,
  },

  menu: {
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  menuRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  menuRowPressed: { backgroundColor: colors.surfaceMuted },
  menuLabel: { ...typography.body, color: colors.text, flex: 1, marginLeft: spacing.md },
  menuLabelDisabled: { color: colors.textTertiary },
  soon: { ...typography.caption, color: colors.textTertiary },

  version: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
});
