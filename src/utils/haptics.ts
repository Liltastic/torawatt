import * as Haptics from 'expo-haptics';

/**
 * expo-haptics bazi cihaz/platformlarda (web, titresim motoru olmayan Android,
 * sessiz mod vb.) reddedilen bir promise dondurebilir; her cagriya ayri
 * try/catch yazmamak icin tek noktadan yutuyoruz.
 */
function safe(fn: () => Promise<void>) {
  fn().catch(() => {});
}

export const haptics = {
  /** Hafif dokunma - kart, chip, ikon butonu gibi dusuk onem tasiyan etkilesimler. */
  tap: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Orta siddet - birincil eylem butonlari (Devam et, Onayla vb.). */
  press: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Guclu darbe - geri donusu olmayan / yikici eylemler (Sarji durdur, Sil). */
  heavy: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  /** Secim degisimi - filtre, sekme, segment gibi bir secenekten digerine gecis. */
  selection: () => safe(() => Haptics.selectionAsync()),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};

export type HapticKind = keyof typeof haptics | 'none';

export function fireHaptic(kind: HapticKind) {
  if (kind === 'none') return;
  haptics[kind]();
}
