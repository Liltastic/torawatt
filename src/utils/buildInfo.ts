import * as Updates from 'expo-updates';

import { formatDateTime } from './format';

/**
 * Telefonda o an calisan surumu gosterir. Manuel bir surum numarasi
 * yerine EAS Update kimligini kullaniyoruz: her `eas update` yayininda
 * otomatik degisir, elle guncellemeyi unutma riski olmaz ve EAS Dashboard'daki
 * "Update ID" ile birebir eslesir (ilk 8 karakter yeterli, tamamiyla ayni sirayla baslar).
 */
export function getRunningUpdateLabel(): string {
  if (__DEV__ || Updates.isEmbeddedLaunch || !Updates.updateId) {
    return 'yerel geliştirme sürümü';
  }

  const shortId = Updates.updateId.slice(0, 8);
  const publishedAt = Updates.createdAt ? formatDateTime(Updates.createdAt.toISOString()) : null;

  return publishedAt ? `güncelleme ${shortId} · ${publishedAt}` : `güncelleme ${shortId}`;
}
