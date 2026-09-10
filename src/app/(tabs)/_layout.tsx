import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';

import { colors, spacing, typography } from '@/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/** Spec bolum 4: Harita / Rota / Sarj / Gecmis / Profil */
const TABS: { name: string; title: string; icon: IoniconName; iconActive: IoniconName }[] = [
  { name: 'map', title: 'Harita', icon: 'map-outline', iconActive: 'map' },
  { name: 'route', title: 'Rota', icon: 'navigate-outline', iconActive: 'navigate' },
  { name: 'charging', title: 'Şarj', icon: 'flash-outline', iconActive: 'flash' },
  { name: 'history', title: 'Geçmiş', icon: 'time-outline', iconActive: 'time' },
  { name: 'profile', title: 'Profil', icon: 'person-outline', iconActive: 'person' },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        sceneStyle: { backgroundColor: colors.background },
      }}>
      {TABS.map(({ name, title, icon, iconActive }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? iconActive : icon} size={23} color={color} />
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
    height: Platform.select({ ios: 88, default: 64 }),
    paddingTop: spacing.sm,
  },
  tabItem: { paddingVertical: spacing.xs },
  tabLabel: { ...typography.caption, fontWeight: '600' },
});
