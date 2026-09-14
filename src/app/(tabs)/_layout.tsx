import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useAuthStore } from '@/store/auth';
import { colors } from '@/theme';
import { haptics } from '@/utils/haptics';

/** Spec bolum 4: Harita / Rota / Sarj / Gecmis / Profil */
const TABS = [
  { name: 'map', title: 'Harita', icon: 'map-outline', iconActive: 'map' },
  { name: 'route', title: 'Rota', icon: 'navigate-outline', iconActive: 'navigate' },
  { name: 'charging', title: 'Şarj', icon: 'flash-outline', iconActive: 'flash' },
  { name: 'history', title: 'Geçmiş', icon: 'time-outline', iconActive: 'time' },
  { name: 'profile', title: 'Profil', icon: 'person-outline', iconActive: 'person' },
] as const;

export default function TabsLayout() {
  const status = useAuthStore((s) => s.status);

  // Token suresi dolup useAuthStore.logout() cagrildiginda (bkz. src/services/api.ts
  // 401 yakalayan yerler) sekmelerde kalinmasin diye guvenlik agi.
  if (status === 'unauthenticated') {
    return <Redirect href="/welcome" />;
  }

  return (
    // Gercek native sekme cubugu (react-native-screens tabanli): iOS 26'da
    // sistem otomatik olarak Liquid Glass ile ciziyor - ozel bir blur/glass
    // bileseni yazmaya gerek yok. Android'de kendi Material tasarimini
    // kullaniyor. tintColor disinda platforma ozel bir sey ayarlamiyoruz ki
    // her iki tarafta da tamamen native gorunup davransin.
    <NativeTabs
      tintColor={colors.primary}
      screenListeners={{ tabPress: () => haptics.selection() }}>
      {TABS.map(({ name, title, icon, iconActive }) => (
        <NativeTabs.Trigger key={name} name={name}>
          <NativeTabs.Trigger.Label>{title}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={{
              default: <NativeTabs.Trigger.VectorIcon family={Ionicons} name={icon} />,
              selected: <NativeTabs.Trigger.VectorIcon family={Ionicons} name={iconActive} />,
            }}
          />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
