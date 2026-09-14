import { Stack } from 'expo-router';

/**
 * initialRouteName acikca "welcome" olmali: bu grupta artik 3 kardes ekran
 * var (welcome/login/register) ve belirtilmezse React Navigation kendi
 * varsayilanini secer. Root'taki "/" Redirect'i "/welcome"yi hedeflese de,
 * bu grup henuz (lazy) kayit olmadan gelen erken bir replace denemesi
 * sessizce basarisiz olup (onUnhandledAction) navigator'i kendi
 * varsayilaninda birakabiliyordu - bu deger acikca "welcome" oldugunda o
 * varsayilan da dogru ekran oluyor.
 */
export default function AuthLayout() {
  return <Stack initialRouteName="welcome" screenOptions={{ headerShown: false }} />;
}
