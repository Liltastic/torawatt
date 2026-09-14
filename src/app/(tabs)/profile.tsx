import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useMemo } from 'react';

import { AnimatedPressable, Card } from '@/components';
import { useChargingHistory } from '@/queries/history';
import { useActiveVehicle } from '@/queries/vehicles';
import { useAuthStore } from '@/store/auth';
import { colors, radius, spacing, typography } from '@/theme';
import { connectorLabels } from '@/types/domain';
import { getRunningUpdateLabel } from '@/utils/buildInfo';
import { formatEnergy, formatPrice } from '@/utils/format';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/** Spec bolum 4'teki profil menusu. Yapilmamis olanlar gorunur ama pasif. */
const MENU: { icon: IoniconName; label: string; href?: string; tag?: string }[] = [
  { icon: 'car-sport-outline', label: 'Araçlarım', href: '/vehicles' },
  { icon: 'card-outline', label: 'Ödeme yöntemleri', href: '/payment/methods', tag: 'demo' },
  { icon: 'heart-outline', label: 'Favoriler', href: '/favorites' },
  { icon: 'notifications-outline', label: 'Bildirimler', href: '/notifications' },
  { icon: 'pricetag-outline', label: 'Kampanyalar' },
  { icon: 'help-buoy-outline', label: 'Yardım ve destek', href: '/support' },
  { icon: 'settings-outline', label: 'Ayarlar', href: '/settings' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const activeVehicle = useActiveVehicle();
  const { data: history } = useChargingHistory();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const onLogout = async () => {
    await logout();
    router.replace('/welcome');
  };

  const stats = useMemo(() => {
    if (!history || history.length === 0) return null;
    return history.reduce(
      (acc, item) => ({
        sessions: acc.sessions + 1,
        energyKwh: acc.energyKwh + item.energyKwh,
        cost: acc.cost + item.cost,
      }),
      { sessions: 0, energyKwh: 0, cost: 0 },
    );
  }, [history]);

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Profil</Text>
        {!!user && (
          <Text style={styles.accountEmail} numberOfLines={1}>
            {user.name ? `${user.name} · ` : ''}
            {user.email}
          </Text>
        )}

        <Animated.View entering={FadeInDown.duration(320)}>
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

            <AnimatedPressable
              accessibilityRole="button"
              haptic="tap"
              onPress={() => router.push('/vehicles')}
              style={({ pressed }) => [styles.vehicleAction, pressed && styles.vehicleActionPressed]}>
              <Text style={styles.vehicleActionText}>
                {activeVehicle ? 'Araçları yönet' : 'Araç ekle'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primaryDark} />
            </AnimatedPressable>
          </Card>
        </Animated.View>

        {stats && (
          <Animated.View entering={FadeInDown.delay(60).duration(320)}>
            <Card style={styles.statsCard}>
              <Text style={styles.vehicleCardLabel}>Şarj özetin</Text>
              <View style={styles.statsRow}>
                <Stat value={String(stats.sessions)} label="oturum" />
                <Stat value={formatEnergy(stats.energyKwh)} label="enerji" />
                <Stat value={formatPrice(stats.cost, 0)} label="harcama" />
              </View>
            </Card>
          </Animated.View>
        )}

        <View style={styles.menu}>
          {MENU.map((item, index) => {
            const enabled = !!item.href;
            return (
              <Animated.View
                key={item.label}
                entering={FadeInDown.delay(80 + index * 40).duration(280)}>
                <AnimatedPressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !enabled }}
                  disabled={!enabled}
                  haptic="selection"
                  scaleTo={0.98}
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

                  {item.tag ? (
                    <Text style={styles.tag}>{item.tag}</Text>
                  ) : null}
                  {enabled ? (
                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                  ) : (
                    <Text style={styles.soon}>yakında</Text>
                  )}
                </AnimatedPressable>
              </Animated.View>
            );
          })}
        </View>

        <AnimatedPressable
          accessibilityRole="button"
          haptic="heavy"
          scaleTo={0.98}
          onPress={onLogout}
          style={({ pressed }) => [styles.logout, pressed && styles.logoutPressed]}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.logoutLabel}>Çıkış yap</Text>
        </AnimatedPressable>

        <Text style={styles.version}>TORA WATT · {getRunningUpdateLabel()}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  statsCard: { marginTop: spacing.md },
  statsRow: { flexDirection: 'row', marginTop: spacing.md },
  stat: { flex: 1 },
  statValue: { ...typography.h3, color: colors.text },
  statLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  title: { ...typography.h2, color: colors.text, paddingTop: spacing.sm },
  accountEmail: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },

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
  tag: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '700',
    marginRight: spacing.sm,
  },

  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.card,
  },
  logoutPressed: { backgroundColor: colors.surfaceMuted },
  logoutLabel: { ...typography.body, fontWeight: '600', color: colors.danger, marginLeft: spacing.sm },

  version: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
});
