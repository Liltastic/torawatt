import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useEffect } from 'react';
import { Platform, Pressable, type GestureResponderEvent, type PressableProps } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useAuthStore } from '@/store/auth';
import { createThemedStyles, spacing, typography, useColors } from '@/theme';
import { haptics } from '@/utils/haptics';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
type IoniconColor = React.ComponentProps<typeof Ionicons>['color'];

/**
 * Spec bolum 4: Harita / Rota / Sarj / Gecmis / Profil.
 *
 * Her sekmenin hem Ionicons (Android'in kendi cizdigimiz cubugu) hem SF Symbols
 * (iOS'un native cubugu) karsiligi var. `md` iOS'ta kullanilmiyor ama
 * NativeTabs'in ikon tipi tek basina `sf` kabul etmiyor - her zaman bir Android
 * karsiligiyla eslesmesi gerekiyor.
 */
const TABS = [
  {
    name: 'map',
    title: 'Harita',
    icon: 'map-outline',
    iconActive: 'map',
    sf: 'map',
    sfSelected: 'map.fill',
    md: 'map',
  },
  {
    name: 'route',
    title: 'Rota',
    icon: 'navigate-outline',
    iconActive: 'navigate',
    sf: 'paperplane',
    sfSelected: 'paperplane.fill',
    md: 'navigation',
  },
  {
    name: 'charging',
    title: 'Şarj',
    icon: 'flash-outline',
    iconActive: 'flash',
    sf: 'bolt',
    sfSelected: 'bolt.fill',
    md: 'bolt',
  },
  {
    name: 'history',
    title: 'Geçmiş',
    icon: 'time-outline',
    iconActive: 'time',
    sf: 'clock',
    sfSelected: 'clock.fill',
    md: 'history',
  },
  {
    name: 'profile',
    title: 'Profil',
    icon: 'person-outline',
    iconActive: 'person',
    sf: 'person',
    sfSelected: 'person.fill',
    md: 'person',
  },
] as const;

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
 * degistirmez. React Navigation'in tabBarButton tipi (ozel ref varyanti)
 * disariya sizdirilmiyor - Pressable'in kendi prop tipini kullanip ref'i
 * kasitli olarak yut, cunku bu buton icin programatik ref'e ihtiyac yok.
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

/** Android: uygulamanin kendi tasarladigi cubuk (Ionicons + marka renkleri). */
function StyledTabs() {
  const colors = useColors();
  const styles = useStyles();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Beyaz cubukta etiket metni: parlak turkuaz 2.6:1, soluk gri 2.5:1'de
        // kaliyordu; ikisi de AA'nin altindaydi.
        tabBarActiveTintColor: colors.primaryText,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarButton: (props) => <HapticTabButton {...props} />,
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

/**
 * iOS: gercek native sekme cubugu (react-native-screens tabanli). iOS 26'da
 * sistem bunu otomatik olarak Liquid Glass ile ciziyor - ozel bir blur/glass
 * bileseni yazmaya gerek yok.
 *
 * Ikonlar `sf` string'i olarak veriliyor: `VectorIcon` ile Ionicons'u sarmalayip
 * `src` uzerinden {default, selected} nesnesi verdigimizde gercek cihazda
 * "[RNScreens] To use selectedIcon prop, the icon prop must also be provided"
 * hatasiyla acilista cokuyordu (VectorIcon'un async getImageSource'u ile native
 * tarafin senkron icon/selectedIcon beklentisi arasinda bir yaris durumu).
 */
function LiquidGlassTabs() {
  const colors = useColors();
  return (
    <NativeTabs tintColor={colors.primaryText} screenListeners={{ tabPress: () => haptics.selection() }}>
      {TABS.map(({ name, title, sf, sfSelected, md }) => (
        <NativeTabs.Trigger key={name} name={name}>
          <NativeTabs.Trigger.Label>{title}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: sf, selected: sfSelected }} md={md} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}

export default function TabsLayout() {
  const status = useAuthStore((s) => s.status);

  // Token suresi dolup useAuthStore.logout() cagrildiginda (bkz. src/services/api.ts
  // 401 yakalayan yerler) sekmelerde kalinmasin diye guvenlik agi.
  if (status === 'unauthenticated') {
    return <Redirect href="/welcome" />;
  }

  // Platform.OS calisma zamaninda degismiyor, yani bu dal bir kez secilip sabit
  // kaliyor - navigator ortasinda tur degistirme riski yok.
  return Platform.OS === 'ios' ? <LiquidGlassTabs /> : <StyledTabs />;
}

const useStyles = createThemedStyles((colors) => ({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 64,
    paddingTop: spacing.sm,
  },
  tabItem: { paddingVertical: spacing.xs },
  tabLabel: { ...typography.caption, fontWeight: '600' },
}));
