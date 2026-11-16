import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

import { formatDateTime } from './format';

/**
 * Telefonda o an calisan surumu gosterir.
 *
 * Magazadan kurulan ikili dosya ilk acilista kendi icindeki paketle calisir
 * (`isEmbeddedLaunch`); o durumda uygulamanin surum numarasi gosterilir. Eskiden
 * bu dal "yerel gelistirme surumu" yaziyordu ve magaza surumunde de gorunuyordu.
 *
 * Sonradan `eas update` ile inen bir guncelleme calisiyorsa EAS Update kimligi
 * gosterilir: her yayinda otomatik degisir ve EAS Dashboard'daki "Update ID" ile
 * birebir eslesir (ilk 8 karakter yeterli).
 */
export function getRunningUpdateLabel(): string {
  if (__DEV__) {
    return 'geliştirme sürümü';
  }

  if (Updates.isEmbeddedLaunch || !Updates.updateId) {
    const version = Constants.expoConfig?.version;
    return version ? `sürüm ${version}` : 'mağaza sürümü';
  }

  const shortId = Updates.updateId.slice(0, 8);
  const publishedAt = Updates.createdAt ? formatDateTime(Updates.createdAt.toISOString()) : null;

  return publishedAt ? `güncelleme ${shortId} · ${publishedAt}` : `güncelleme ${shortId}`;
}
