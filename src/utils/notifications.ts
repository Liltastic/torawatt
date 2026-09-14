import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import { RESERVATION_GRACE_MINUTES } from '@/types/domain';

/**
 * Expo Go, SDK 53'ten beri expo-notifications'i tamamen kaldirdi: sadece
 * belirli cagrilar degil, modulun `import`/`require` edilmesi bile hemen
 * fırlatıyor. Bu yuzden modulu statik `import` ETMIYORUZ - Expo Go'daysak
 * `require` hic calismiyor, boylece native modul hic yuklenmeye calismiyor.
 * Kullanicinin telefonu da dahil butun testler su an Expo Go uzerinden
 * yapildigi icin bu guard sart; gercek bildirimler ancak bir
 * development/production build'de calisir.
 */
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export const notificationsAvailable = !isExpoGo;

let Notifications: any = null;
if (!isExpoGo) {
  // require (import degil): satiri hic calismayan bir dal icinde tutmak,
  // Metro'nun modulu yine de statik olarak paketlemesine engel olmuyor ama
  // Expo Go'da bu kod yolu hic CALISMADIGI icin native tarafta fırlatan
  // kayit/init hicbir zaman tetiklenmiyor.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

let channelReady = false;

async function ensureAndroidChannel() {
  if (channelReady || Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('reservations', {
    name: 'Rezervasyonlar',
    importance: Notifications.AndroidImportance.HIGH,
  });
  channelReady = true;
}

/** Su anki izin durumu; Expo Go'da (destek yok) her zaman kapali doner. */
export async function getNotificationPermissionStatus(): Promise<{
  granted: boolean;
  canAskAgain: boolean;
}> {
  if (!notificationsAvailable) return { granted: false, canAskAgain: false };
  const status = await Notifications.getPermissionsAsync();
  return { granted: status.granted, canAskAgain: status.canAskAgain };
}

/** İzin daha once verilmemisse ister; reddedilirse (ya da Expo Go'daysak) false doner. */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!notificationsAvailable) return false;

  await ensureAndroidChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

interface ReservationForNotify {
  id: string;
  stationName: string;
  startsAt: string;
  durationMinutes: number;
}

const startId = (reservationId: string) => `reservation-${reservationId}-start`;
const deadlineId = (reservationId: string) => `reservation-${reservationId}-deadline`;

/**
 * Rezervasyon basladiginda ve bekleme suresi dolmadan az once iki hatirlatma
 * planlar. Gecmiste kalan tetikleyiciler atlanir (ornegin "Simdi" secilip
 * baslangic zaten gecmisse).
 */
export async function scheduleReservationReminders(reservation: ReservationForNotify) {
  const granted = await ensureNotificationPermission();
  if (!granted) return;

  const startsAtMs = new Date(reservation.startsAt).getTime();
  const deadlineMs = startsAtMs + RESERVATION_GRACE_MINUTES * 60_000;
  const warnAtMs = deadlineMs - 5 * 60_000;

  if (startsAtMs > Date.now()) {
    await Notifications.scheduleNotificationAsync({
      identifier: startId(reservation.id),
      content: {
        title: 'Rezervasyonun başladı',
        body: `${reservation.stationName} · soket ${RESERVATION_GRACE_MINUTES} dakika sana ayrıldı.`,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: startsAtMs },
    });
  }

  if (warnAtMs > Date.now()) {
    await Notifications.scheduleNotificationAsync({
      identifier: deadlineId(reservation.id),
      content: {
        title: 'Süren azalıyor',
        body: `${reservation.stationName} · gelmezsen rezervasyon 5 dakika içinde düşecek.`,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: warnAtMs },
    });
  }
}

/** Rezervasyon iptal edildiginde / varis bildirildiginde artik gereksiz hatirlatmalari iptal eder. */
export async function cancelReservationReminders(reservationId: string) {
  if (!notificationsAvailable) return;
  await Notifications.cancelScheduledNotificationAsync(startId(reservationId)).catch(() => {});
  await Notifications.cancelScheduledNotificationAsync(deadlineId(reservationId)).catch(() => {});
}
