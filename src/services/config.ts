/**
 * Backend API adresi. .env dosyasindaki EXPO_PUBLIC_API_URL degerinden
 * gelir; Metro bu degiskeni derleme zamaninda paketin icine gomer
 * (Expo SDK 49+, EXPO_PUBLIC_ onekiyle).
 *
 * Deger degistiyse (farkli LAN, tunnel) Metro'yu yeniden baslatmak gerekir -
 * env degiskenleri sicak yeniden yuklenmiyor.
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

if (__DEV__ && !process.env.EXPO_PUBLIC_API_URL) {
  console.warn(
    'EXPO_PUBLIC_API_URL tanımlı değil, http://localhost:4000 varsayılıyor. ' +
      'Fiziksel cihaz veya emülatörde bu genelde çalışmaz; proje kökünde .env dosyası oluştur (bkz. .env.example).',
  );
}

/**
 * Arac gorselleri icin carimagesapi.com anahtari (bkz. services/carImage).
 * Tanimli degilse gorseller sessizce gosterilmiyor, ekran calismaya devam
 * ediyor - anahtar olmadan da uygulama bozulmasin diye.
 */
export const CAR_IMAGE_API_KEY = process.env.EXPO_PUBLIC_CAR_IMAGE_API_KEY ?? '';
