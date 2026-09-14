import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import { useEffect } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  type GestureResponderEvent,
  type PressableProps,
} from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { GlassTabBar } from '@/components/GlassTabBar';
import { useAuthStore } from '@/store/auth';
import { colors, spacing, typography } from '@/theme';
import { haptics } from '@/utils/haptics';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
type IoniconColor = React.ComponentProps<typeof Ionicons>['color'];

/** Spec bolum 4: Harita / Rota / Sarj / Gecmis / Profil */
const TABS: { name: string; title: string; icon: IoniconName; iconActive: IoniconName }[] = [
  { name: 'map', title: 'Harita', icon: 'map-outline', iconActive: 'map' },
  { name: 'route', title: 'Rota', icon: 'navigate-outline', iconActive: 'navigate' },
  { name: 'charging', title: 'Şarj', icon: 'flash-outline', iconActive: 'flash' },
  { name: 'history', title: 'Geçmiş', icon: 'time-outline', iconActive: 'time' },
  { name: 'profile', title: 'Profil', icon: 'person-outline', iconActive: 'person' },
];

/** Odaklandiginda hafifce zipleyen sekme ikonu; secim degisince dokunsal geri bildirim verir. */
function AnimatedTabIcon({
  name,
  color,
  focused,
}: {
  name: IoniconName;
  color: IoniconColor;
  focused: boolean;
}) {
  const scale = useSharedValue(focused ? 1.06 : 1);

  useEffect(() => {
    scale.value = withTiming(focused ? 1.06 : 1, {
      duration: 180,
      easing: Easing.out(Easing.quad),
    });
  }, [focused, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={animatedStyle}>
      <Ionicons name={name} size={23} color={color} />
    </Animated.View>
  );
}

/**
 * Varsayilan sekme butonunu titresimle sarmalar; gorseli/dokunma alanini
 * degistirmez. Yalnizca Android'de kullanilir (bkz. asagidaki iOS/Android
 * ayrimi) - GlassTabBar kendi Pressable/titresim mantigini iceriyor.
 */
function HapticTabButton({
  children,
  onPress,
  ref: _ref,
  ...rest
}: PressableProps & { ref?: unknown; children?: React.ReactNode }) {
  return (
    <Pressable
      {...rest}
      onPress={(event: GestureResponderEvent) => {
        haptics.selection();
        onPress?.(event);
      }}>
      {children}
    </Pressable>
  );
}

const isIOS = Platform.OS === 'ios';

export default function TabsLayout() {
  const status = useAuthStore((s) => s.status);

  // Token suresi dolup useAuthStore.logout() cagrildiginda (bkz. src/services/api.ts
  // 401 yakalayan yerler) sekmelerde kalinmasin diye guvenlik agi.
  if (status === 'unauthenticated') {
    return <Redirect href="/welcome" />;
  }

  return (
    <Tabs
      // "Liquid Glass" yuzen sekme cubugu sadece iPhone'a ozel (iOS 26'nin
      // kendi tasarim dili) - Android standart, dokme cubugunu koruyor.
      tabBar={isIOS ? (props) => <GlassTabBar {...props} /> : undefined}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: isIOS ? undefined : styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarButton: isIOS ? undefined : (props) => <HapticTabButton {...props} />,
        sceneStyle: { backgroundColor: colors.background },
      }}>
      {TABS.map(({ name, title, icon, iconActive }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, focused }) => (
              <AnimatedTabIcon name={focused ? iconActive : icon} color={color} focused={focused} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 64,
    paddingTop: spacing.sm,
  },
  tabItem: { paddingVertical: spacing.xs },
  tabLabel: { ...typography.caption, fontWeight: '600' },
});
