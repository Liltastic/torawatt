import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { AppState, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BOOT_SCREEN_MS, BootScreen } from '@/components';
import { warmUpServer } from '@/services/api';
import { setQueryClientForAuth, useAuthStore } from '@/store/auth';
import { useSessionStore } from '@/store/session';
import { colors } from '@/theme';
import { checkForImmediateUpdate } from '@/utils/autoUpdate';

/** Alttan acilan, kendi kapatma carpisi olan akislar. */
const MODAL_SCREEN = { presentation: 'modal' } as const;

// Kok pencere arka planini boyar; aksi halde status bar / navigation bar
// arkasinda sistemin varsayilan siyahi gorunuyor.
void SystemUI.setBackgroundColorAsync(colors.background);

export default function RootLayout() {
  // Her acilista yayinlanmis en son EAS Update'i hemen indirip uygular;
  // varsayilan davranista bir sonraki acilisa kadar beklerdi.
  useEffect(() => {
    checkForImmediateUpdate();
  }, []);

  // API uykudaysa (Render ucretsiz katmani) uyanmasi 30 sn'yi asiyor; kullanici
  // giris formunu doldururken ya da uygulamayi one getirirken bunu simdiden
  // baslatiyoruz ki ilk gercek istek uyanmis bir sunucuya gitsin (bkz. api.ts).
  useEffect(() => {
    warmUpServer();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') warmUpServer();
    });
    return () => sub.remove();
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

  // Store, provider'in altinda olmadigi icin useQueryClient kullanamiyor;
  // giris/kayit sirasinda cache'i bosaltabilsin diye client'i ona veriyoruz.
  useEffect(() => {
    setQueryClientForAuth(queryClient);
  }, [queryClient]);

  // Marka acilis ekrani en az BOOT_SCREEN_MS gorunsun: oturum onbellekten
  // aninda kurulunca (bkz. store/auth hydrate) ekran bir kare gorunup kayboluyordu.
  const [bootDelayDone, setBootDelayDone] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setBootDelayDone(true), BOOT_SCREEN_MS);
    return () => clearTimeout(timer);
  }, []);

  const authStatus = useAuthStore((s) => s.status);
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  // Cikista onceki hesabin hicbir izi bellekte kalmasin. Burada yapiliyor cunku
  // bu effect, (tabs)/_layout'un Redirect'e dusup sekmeleri unmount ettigi
  // render'dan sonra calisir; logout() icinde cagrilsaydi hala mount olan
  // sorgular token'siz refetch edip 401 -> logout zincirini tetiklerdi.
  //
  // Sarj oturumu da temizleniyor: o zustand store'u modul seviyesinde yasiyor ve
  // kendi setInterval'ini tutuyor. Temizlenmezse B kullanicisi giris yaptiginda
  // Sarj sekmesi A'nin canli oturumunu gostermeye devam ediyor, dahasi oturum
  // COMPLETED olunca A'nin sarj kaydi B'nin token'iyla B'nin gecmisine yaziliyor.
  const userId = useAuthStore((s) => s.user?.id);
  useEffect(() => {
    if (userId) return;
    queryClient.clear();
    useSessionStore.getState().clear();
  }, [userId, queryClient]);

  // Stack, oturum durumu belli olmadan mount olmasin: src/app/index.tsx ilk
  // render'inda dogru hedefe (welcome/map) senkron karar verebilsin diye -
  // aksi halde Stack once mount olup bir an sonra Redirect tetiklenince
  // (SecureStore okumasi async oldugu icin), Expo Router'in lazy route
  // chunk'lari henuz kayitli olmadan gelen bu gecikmis navigasyon
  // "onUnhandledAction" ile sessizce basarisiz olup (auth) grubunun rastgele
  // bulunan bir cocugunda (login/register) kalinmasina yol aciyordu.
  if (authStatus === 'hydrating' || !bootDelayDone) {
    return <BootScreen />;
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

            {/* Bu ucu zaten kapatma carpisiyla tasarlanmisti ama normal bir
                sayfa gibi yandan giriyordu. Modal olarak sunulunca "bir sey
                ekliyorum / onayliyorum, isim bitince kapanacak" akisi
                detay sayfalarindan ayrisiyor. Gecis animasyonunu her platform
                kendi yerel bicimiyle yapiyor. */}
            <Stack.Screen name="charger/[connectorId]" options={MODAL_SCREEN} />
            <Stack.Screen name="booking/new" options={MODAL_SCREEN} />
            <Stack.Screen name="vehicles/add" options={MODAL_SCREEN} />
          </Stack>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
