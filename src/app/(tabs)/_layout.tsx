import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useAuthStore } from '@/store/auth';
import { colors } from '@/theme';
import { haptics } from '@/utils/haptics';

/**
 * Spec bolum 4: Harita / Rota / Sarj / Gecmis / Profil.
 *
 * Ikonlar SF Symbols (iOS) ve Material Symbols (Android) - NativeTabs'in
 * kendi native ikon yollari. `VectorIcon` ile Ionicons'u sarmalayip `src`
 * uzerinden {default, selected} nesnesi vermeyi denedigimizde gercek
 * cihazda "[RNScreens] To use selectedIcon prop, the icon prop must also
 * be provided" hatasiyla acilista cokuyordu (VectorIcon'un async
 * getImageSource'u ile native tarafin senkron icon/selectedIcon
 * beklentisi arasinda bir yaris durumu). sf/md string degerleri senkron
 * oldugu icin bu sorunu tamamen ortadan kaldiriyor - ayrica zaten "native"
 * bir sekme cubugu icin platform ikonlarini kullanmak daha dogru.
 */
const TABS = [
  { name: 'map', title: 'Harita', sf: 'map', sfSelected: 'map.fill', md: 'map' },
  {
    name: 'route',
    title: 'Rota',
    sf: 'paperplane',
    sfSelected: 'paperplane.fill',
    md: 'navigation',
  },
  { name: 'charging', title: 'Şarj', sf: 'bolt', sfSelected: 'bolt.fill', md: 'bolt' },
  { name: 'history', title: 'Geçmiş', sf: 'clock', sfSelected: 'clock.fill', md: 'history' },
  { name: 'profile', title: 'Profil', sf: 'person', sfSelected: 'person.fill', md: 'person' },
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
      {TABS.map(({ name, title, sf, sfSelected, md }) => (
        <NativeTabs.Trigger key={name} name={name}>
          <NativeTabs.Trigger.Label>{title}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: sf, selected: sfSelected }} md={md} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
