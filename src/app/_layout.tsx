import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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

const styles = StyleSheet.create({ flex: { flex: 1 } });
