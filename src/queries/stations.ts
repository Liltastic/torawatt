import { useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { stationsApi } from '@/services/api';
import {
  fetchExternalStation,
  fetchNearbyExternalStations,
  isExternalStationId,
} from '@/services/evcs';
import { useLocationStore } from '@/store/location';
import type { Coordinate, Station } from '@/types/domain';

export const stationKeys = {
  all: ['stations'] as const,
  detail: (id: string) => ['stations', id] as const,
  /** Katalog listesi konuma bagli; anahtar da oyle (bkz. useExternalStations). */
  external: (latitude: number, longitude: number) =>
    ['stations', 'external', latitude, longitude] as const,
  externalRoot: ['stations', 'external'] as const,
};

/**
 * Katalogdan cevredeki istasyonlar. Istanbul'da 5 km yaricapta 300'un uzerinde
 * kayit var; liste mesafeye gore sirali geldigi icin ilk 200'u almak "en yakin"
 * gorunumu icin fazlasiyla yetiyor ve harita zaten kumeliyor.
 */
const EXTERNAL_RADIUS_KM = 25;
const EXTERNAL_SIZE = 200;

/** Sunucu sonucu 10 dk onbellekliyor; istemcide daha sik sormanin anlami yok. */
const EXTERNAL_STALE_MS = 10 * 60_000;

/**
 * Konum izni yoksa harita Istanbul'dan aciliyor (bkz. map/StationMap
 * DEFAULT_CENTER); katalog da ayni yerden beslensin, ekran bos kalmasin.
 */
const FALLBACK_CENTER: Coordinate = { latitude: 41.055, longitude: 29.0 };

/**
 * Konum her metrede degisiyor; anahtari yaklasik 1 km'ye yuvarlamazsak
 * kullanici yurudukce sorgu anahtari degisip listeyi bastan yukletir.
 */
const roundCoord = (value: number) => Math.round(value * 100) / 100;

function useExternalStations() {
  const coords = useLocationStore((state) => state.coords);
  const center = coords ?? FALLBACK_CENTER;
  const latitude = roundCoord(center.latitude);
  const longitude = roundCoord(center.longitude);

  return useQuery({
    queryKey: stationKeys.external(latitude, longitude),
    queryFn: () =>
      fetchNearbyExternalStations({ latitude, longitude }, EXTERNAL_RADIUS_KM, EXTERNAL_SIZE),
    staleTime: EXTERNAL_STALE_MS,
  });
}

/**
 * Musaitlik 15 sn sonra bayat sayilir ama staleTime TEK BASINA refetch
 * tetiklemez: pratikte tazeleme yalnizca yeni bir mount ile oluyor.
 * refetchOnWindowFocus/refetchOnReconnect RN'de islevsiz - React Query'nin
 * focusManager/onlineManager koprusu AppState/NetInfo'ya baglanmadigi surece
 * isFocused()/isOnline() sabit true doner - ve Harita sekmesi oturum boyunca
 * mount kaldigi icin liste orada donuk kalir. Periyodik poll bilerek
 * eklenmedi: sunucudaki musaitlik su an statik seed verisi, degisen bir sey
 * yok. Canli musaitlik geldiginde refetchInterval buraya eklenmeli.
 *
 * Liste iki kaynagin birlesimi: kendi istasyonlarimiz (sarj/rezervasyon
 * yapilabilen) ve EVCS katalogundan cevredeki istasyonlar (yalnizca bilgi,
 * bkz. services/evcs.ts). Katalog istegi basarisiz olursa ekran hata
 * gostermez - kendi istasyonlarimiz yine listelenir.
 */
export function useStations() {
  const own = useQuery({
    queryKey: stationKeys.all,
    queryFn: stationsApi.list,
    staleTime: 15_000,
  });
  const external = useExternalStations();

  const data = useMemo(() => {
    const ownStations = own.data;
    const externalStations = external.data;
    if (!ownStations && !externalStations) return undefined;

    // Kendi istasyonlarimiz once: uygulamadan sarj baslatilabilen tek kayitlar onlar.
    return [...(ownStations ?? []), ...(externalStations ?? [])];
  }, [own.data, external.data]);

  const refetch = useCallback(async () => {
    await Promise.all([own.refetch(), external.refetch()]);
  }, [own, external]);

  return {
    data,
    // Hata yalnizca kendi ucumuzdan: katalog dusse de uygulama calismaya devam etmeli.
    isError: own.isError,
    error: own.error,
    isLoading: own.isLoading || external.isLoading,
    isRefetching: own.isRefetching || external.isRefetching,
    refetch,
  };
}

/** Katalog istasyonu daha once listede gorulduyse detay gelene kadar onu goster. */
function cachedExternalStation(
  entries: [QueryKey, Station[] | undefined][],
  id: string,
): Station | undefined {
  for (const [, stations] of entries) {
    const found = stations?.find((station) => station.id === id);
    if (found) return found;
  }
  return undefined;
}

export function useStation(id: string | undefined) {
  const queryClient = useQueryClient();
  const external = !!id && isExternalStationId(id);

  return useQuery({
    queryKey: stationKeys.detail(id ?? ''),
    // Katalog istasyonunun soketleri yalnizca detay ucunda; listede sayilardan
    // uretilmis tahmin duruyor (bkz. services/evcs.ts).
    queryFn: () => (external ? fetchExternalStation(id!) : stationsApi.get(id!)),
    enabled: !!id,
    staleTime: 15_000,
    // Kendi ucumuzda liste ve detay ayni serializeStation ciktisini (connectors
    // dahil) donduruyor; istasyon zaten cache'teyken "Sarj Baslat"/"Rezerve Et"
    // ekranlarinda tam ekran spinner gostermenin anlami yok.
    // initialDataUpdatedAt olmadan veri sonsuza kadar taze sayilirdi; listenin
    // gercek yasini verdigimiz icin bayatsa arka planda yine tazeleniyor.
    initialData: external
      ? undefined
      : () => queryClient.getQueryData<Station[]>(stationKeys.all)?.find((s) => s.id === id),
    initialDataUpdatedAt: external
      ? undefined
      : () => queryClient.getQueryState(stationKeys.all)?.dataUpdatedAt,
    // Katalogda liste ve detay AYNI sey degil: listedeki soketler sayilardan
    // uretilmis tahmin (bkz. services/evcs.ts). Bu yuzden initialData degil
    // placeholderData - ekran aninda dolar ama detay yine de cekilir ve
    // gercek soketler tahminin uzerine yazar.
    placeholderData: external
      ? cachedExternalStation(
          queryClient.getQueriesData<Station[]>({ queryKey: stationKeys.externalRoot }),
          id!,
        )
      : undefined,
  });
}
