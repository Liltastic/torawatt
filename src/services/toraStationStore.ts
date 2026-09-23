import { File, Paths } from 'expo-file-system';

import type { Station } from '@/types/domain';

/**
 * Taranmis TORA istasyon listesinin cihazdaki kopyasi.
 *
 * Katalog ucunda isletmeci filtresi olmadigi icin tum ag ancak ulke taramasiyla
 * bulunuyor (bkz. services/evcs.ts fetchAllToraStations): ~100 istek, birkac MB.
 * Bunu her aciliata yapmak anlamsiz - istasyonlar gun icinde degismiyor.
 * Sonuc burada saklanip suresi dolana kadar oldugu gibi kullaniliyor.
 */
const FILE_NAME = 'tora-stations.json';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface StoredPayload {
  savedAt: number;
  stations: Station[];
}

const file = () => new File(Paths.document, FILE_NAME);

/** Kayit yoksa, bozuksa ya da bayatsa undefined doner; cagiran yeniden tarar. */
export async function readStoredToraStations(): Promise<Station[] | undefined> {
  try {
    const stored = file();
    if (!stored.exists) return undefined;

    const payload = JSON.parse(await stored.text()) as StoredPayload;
    if (!Array.isArray(payload.stations) || payload.stations.length === 0) return undefined;
    if (Date.now() - payload.savedAt > MAX_AGE_MS) return undefined;

    return payload.stations;
  } catch {
    // Bozuk/okunamayan dosya yuzunden uygulama istasyonsuz kalmasin.
    return undefined;
  }
}

export async function writeStoredToraStations(stations: Station[]): Promise<void> {
  try {
    const stored = file();
    if (!stored.exists) stored.create();
    const payload: StoredPayload = { savedAt: Date.now(), stations };
    stored.write(JSON.stringify(payload));
  } catch {
    // Yazamamak olumcul degil: liste bu oturumda bellekte zaten var.
  }
}
