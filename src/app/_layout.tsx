import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAuthStore } from '@/store/auth';
import { colors } from '@/theme';
import { checkForImmediateUpdate } from '@/utils/autoUpdate';

// Kok pencere arka planini boyar; aksi halde status bar / navigation bar
// arkasinda sistemin varsayilan siyahi gorunuyor.
void SystemUI.setBackgroundColorAsync(colors.background);

export default function RootLayout() {
  // Her acilista yayinlanmis en son EAS Update'i hemen indirip uygular;
  // varsayilan davranista bir sonraki acilisa kadar beklerdi.
  useEffect(() => {
    checkForImmediateUpdate();
  }, []);

  // useState ile olusturuluyor: modul kapsaminda bir kez olusturulsa render'lar
  // arasi payli kalir ama Fast Refresh'te eski client'a takilip kalinir;
  // component icinde bir kez olusturmak ikisini de cozer.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            // Sunucu ayakta degilse (dev'de sik) gereksiz tekrar denemeyle
            // kullaniciyi bekletmemek icin kisa tut.
            staleTime: 10_000,
          },
        },
      }),
  );

  const authStatus = useAuthStore((s) => s.status);
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  // Stack, oturum durumu belli olmadan mount olmasin: src/app/index.tsx ilk
  // render'inda dogru hedefe (welcome/map) senkron karar verebilsin diye -
  // aksi halde Stack once mount olup bir an sonra Redirect tetiklenince
  // (SecureStore okumasi async oldugu icin), Expo Router'in lazy route
  // chunk'lari henuz kayitli olmadan gelen bu gecikmis navigasyon
  // "onUnhandledAction" ile sessizce basarisiz olup (auth) grubunun rastgele
  // bulunan bir cocugunda (login/register) kalinmasina yol aciyordu.
  if (authStatus === 'hydrating') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
