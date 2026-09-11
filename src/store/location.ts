import * as Location from 'expo-location';
import { create } from 'zustand';

import type { Coordinate } from '@/types/domain';

export type LocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';

interface LocationState {
  coords?: Coordinate;
  status: LocationStatus;
  /**
   * Izin ister, ilk konumu alir ve cihaz hareket ettikce guncellemeye baslar.
   * Birden fazla ekran cagirabilir; ikinci cagri hicbir sey yapmaz.
   */
  ensure: () => Promise<void>;
  /** Kullanici "konumuma git"e bastiginda taze bir okuma alir. */
  refresh: () => Promise<Coordinate | undefined>;
}

let watcher: Location.LocationSubscription | null = null;

/** GPS sinyali olmayan yerde (kapali otopark, emulator) sonsuza kadar beklememek icin. */
const FIX_TIMEOUT_MS = 8_000;

// High: surus senaryosunda GPS'i gercekten acar; Balanced yalnizca Wi-Fi/hucre
// tabanli konumla yetinip sehir disinda / arac icinde kaba sonuc verebiliyor.

const toCoordinate = (position: Location.LocationObject): Coordinate => ({
  latitude: position.coords.latitude,
  longitude: position.coords.longitude,
});

async function readPosition(): Promise<Coordinate | undefined> {
  // Once cihazin son bilinen konumu: aninda gelir ve harita hemen kullaniciya gider;
  // arkasindan taze okuma dener, gelirse watcher zaten guncelleyecek.
  const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000 }).catch(
    () => null,
  );
  if (lastKnown) return toCoordinate(lastKnown);

  const fresh = await Promise.race([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), FIX_TIMEOUT_MS)),
  ]).catch(() => null);

  return fresh ? toCoordinate(fresh) : undefined;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  coords: undefined,
  status: 'idle',

  ensure: async () => {
    const { status } = get();
    if (status === 'granted' || status === 'requesting') return;

    set({ status: 'requesting' });

    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      set({ status: 'denied' });
      return;
    }

    // Izin alindi; sinyal gelene kadar "unavailable" kalir, watcher ilk fix'te
    // konumu ve durumu gunceller (kapali otoparktan cikinca kendiliginden duzelir).
    watcher?.remove();
    watcher = await Location.watchPositionAsync(
      // 30 m'den kucuk hareketler icin liste yeniden siralanmasin diye esik koyduk.
      { accuracy: Location.Accuracy.High, distanceInterval: 30, timeInterval: 15_000 },
      (position) => set({ coords: toCoordinate(position), status: 'granted' }),
    ).catch(() => null);

    const coords = await readPosition();
    if (coords) {
      set({ coords, status: 'granted' });
    } else if (get().status === 'requesting') {
      set({ status: 'unavailable' });
    }
  },

  refresh: async () => {
    const { status } = get();
    if (status === 'idle' || status === 'denied') {
      await get().ensure();
      return get().coords;
    }

    const coords = await readPosition();
    if (coords) set({ coords, status: 'granted' });
    return coords ?? get().coords;
  },
}));
