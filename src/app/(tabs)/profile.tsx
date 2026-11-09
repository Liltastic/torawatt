import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Linking, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  AnimatedPressable,
  Card,
  CompactHeader,
  useCollapsingTitle,
} from '@/components';
import { useActiveVehicle } from '@/queries/vehicles';
import { useAuthStore, useIsSignedIn } from '@/store/auth';
import { createThemedStyles, radius, spacing, typography, useColors } from '@/theme';
import { connectorLabels } from '@/types/domain';
import { getRunningUpdateLabel } from '@/utils/buildInfo';
import { useTabBarInset } from '@/utils/tabBar';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const PRIVACY_POLICY_URL = 'https://torasarj.com/kvkk-aydinlatma-metni/';

/** Profil menusu. accountOnly satirlar hesap gerektiriyor, misafire gosterilmiyor. */
const MENU: {
  icon: IoniconName;
  label: string;
  href?: string;
  url?: string;
  accountOnly?: boolean;
}[] = [
  { icon: 'car-sport-outline', label: 'Araçlarım', href: '/vehicles', accountOnly: true },
  { icon: 'heart-outline', label: 'Favoriler', href: '/favorites', accountOnly: true },
  { icon: 'help-buoy-outline', label: 'Yardım ve destek', href: '/support' },
  { icon: 'shield-checkmark-outline', label: 'Gizlilik politikası', url: PRIVACY_POLICY_URL },
  { icon: 'settings-outline', label: 'Ayarlar', href: '/settings', accountOnly: true },
];

export default function ProfileScreen() {
  const colors = useColors();
  const styles = useStyles();
  const router = useRouter();
  const activeVehicle = useActiveVehicle();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const signedIn = useIsSignedIn();
  const menu = signedIn ? MENU : MENU.filter((item) => !item.accountOnly);
  // iOS'ta sekme cubugu icerigin UZERINDE duruyor (bkz. utils/tabBar); bu pay
  // olmadan "Cikis yap" ve surum satiri cubugun altinda kaliyor.
  const tabBarInset = useTabBarInset();
  const { scrollY, onScroll } = useCollapsingTitle();

  const onLogout = async () => {
    await logout();
    router.replace('/welcome');
  };

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: spacing.xxl + tabBarInset },
        ]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Profil</Text>
        {!!user && (
          <Text style={styles.accountEmail} numberOfLines={1}>
            {user.name ? `${user.name} · ` : ''}
            {user.email}
          </Text>
        )}

        <Animated.View entering={FadeInDown.duration(320)}>
          <Card style={styles.vehicleCard}>
            <Text style={styles.vehicleCardLabel}>{signedIn ? 'Aktif araç' : 'Üyelik'}</Text>

            {!signedIn ? (
              <>
                <Text style={styles.vehicleEmpty}>Henüz giriş yapmadın</Text>
                <Text style={styles.vehicleSpecs}>
                  Üye olursan aracını kaydedip rota planlayabilir, istasyonları favorilerine
                  ekleyebilirsin.
                </Text>
              </>
            ) : activeVehicle ? (
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
              onPress={() => (signedIn ? router.push('/vehicles') : router.replace('/welcome'))}
              style={({ pressed }) => [styles.vehicleAction, pressed && styles.vehicleActionPressed]}>
              <Text style={styles.vehicleActionText}>
                {!signedIn
                  ? 'Giriş yap veya üye ol'
                  : activeVehicle
                    ? 'Araçları yönet'
                    : 'Araç ekle'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primaryText} />
            </AnimatedPressable>
          </Card>
        </Animated.View>

        <View style={styles.menu}>
          {menu.map((item, index) => {
            const enabled = !!item.href || !!item.url;
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
                  onPress={() => {
                    if (item.url) void Linking.openURL(item.url);
                    else if (item.href) router.push(item.href as never);
                  }}
                  style={({ pressed }) => [
                    styles.menuRow,
                    index < menu.length - 1 && styles.menuRowDivider,
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
                </AnimatedPressable>
              </Animated.View>
            );
          })}
        </View>

        {signedIn && (
          <AnimatedPressable
            accessibilityRole="button"
            haptic="heavy"
            scaleTo={0.98}
            onPress={onLogout}
            style={({ pressed }) => [styles.logout, pressed && styles.logoutPressed]}>
            <Ionicons name="log-out-outline" size={20} color={colors.dangerText} />
            <Text style={styles.logoutLabel}>Çıkış yap</Text>
          </AnimatedPressable>
        )}

        <Text style={styles.version}>TORA WATT · {getRunningUpdateLabel()}</Text>
      </Animated.ScrollView>

      <CompactHeader title="Profil" scrollY={scrollY} />
    </SafeAreaView>
  );
}

const useStyles = createThemedStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  title: { ...typography.h2, color: colors.text, paddingTop: spacing.sm },
  accountEmail: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },

  vehicleCard: { marginTop: spacing.xl },
  vehicleCardLabel: { ...typography.captionStrong, color: colors.primaryText, letterSpacing: 1 },
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
  vehicleActionPressed: { backgroundColor: colors.primarySoftPressed },
  vehicleActionText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.primaryText,
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

  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.card,
  },
  logoutPressed: { backgroundColor: colors.surfaceMuted },
  logoutLabel: { ...typography.body, fontWeight: '600', color: colors.dangerText, marginLeft: spacing.sm },

  version: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
}));
