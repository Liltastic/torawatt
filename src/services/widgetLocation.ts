import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import type { Coordinate } from '@/types/domain';

/**
 * Android widget'i icin son bilinen konum.
 *
 * Widget guncellemesi ARKA PLANDA calisiyor ve Android 10'dan beri arka
 * plandaki bir uygulama ACCESS_BACKGROUND_LOCATION olmadan konum alamiyor -
 * emulatorde olculdu: uc saglayici da bos dondu, getCurrentLocation 3 ms'de
 * null verdi. O izni istemek Play'de ayri bir beyan ve inceleme gerektiriyor
 * ve "widget'ta en yakin istasyonu gostermek" zayif bir gerekce.
 *
 * Onun yerine izni ZATEN olan taraf, yani uygulamanin kendisi, on plandayken
 * aldigi koordinati kendi veri klasorune yaziyor; widget ayni uygulamanin
 * dosyasi oldugu icin onu izinsiz okuyabiliyor
 * (bkz. plugins/android/ToraWidgetProvider.kt storedLocation).
 *
 * iOS'ta gerek yok: orada widget Info.plist'teki NSWidgetWantsLocation ile
 * konuma dogrudan erisiyor (bkz. targets/widget/Info.plist).
 */
const FILE_NAME = 'widget-location.json';

export function publishLocationForWidget(coords: Coordinate): void {
  if (Platform.OS !== 'android') return;

  try {
    const file = new File(Paths.document, FILE_NAME);
    if (!file.exists) file.create();
    file.write(
      JSON.stringify({
        latitude: coords.latitude,
        longitude: coords.longitude,
        savedAt: Date.now(),
      }),
    );
  } catch {
    // Yazamamak uygulamanin isleyisini hic etkilemiyor; yalnizca widget
    // bir sonraki acilisa kadar eski konumu kullanir.
  }
}
