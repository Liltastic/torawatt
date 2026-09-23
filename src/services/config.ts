/**
 * Backend API adresi. .env dosyasindaki EXPO_PUBLIC_API_URL degerinden
 * gelir; Metro bu degiskeni derleme zamaninda paketin icine gomer
 * (Expo SDK 49+, EXPO_PUBLIC_ onekiyle).
 *
 * Deger degistiyse (farkli LAN, tunnel) Metro'yu yeniden baslatmak gerekir -
 * env degiskenleri sicak yeniden yuklenmiyor.
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * Grubun kendi sarj platformunun mobil API'si; TORA WATT buradan yalnizca
 * istasyon verisi okuyor (bkz. services/evcs.ts). Kullandigimiz uclar token
 * istemiyor, o yuzden adresten baska bir sey gerekmiyor.
 */
export const EVCS_API_URL =
  process.env.EXPO_PUBLIC_EVCS_API_URL ?? 'https://testmobileapi2.torasarj.net';

if (__DEV__ && !process.env.EXPO_PUBLIC_API_URL) {
  console.warn(
    'EXPO_PUBLIC_API_URL tanımlı değil, http://localhost:4000 varsayılıyor. ' +
      'Fiziksel cihaz veya emülatörde bu genelde çalışmaz; proje kökünde .env dosyası oluştur (bkz. .env.example).',
  );
}
