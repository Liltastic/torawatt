import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { stationsApi } from '@/services/api';
import {
  fetchAllToraStations,
  fetchExternalStation,
  fetchNearbyToraStations,
  isExternalStationId,
} from '@/services/evcs';
import { readStoredToraStations, writeStoredToraStations } from '@/services/toraStationStore';
import { useLocationStore } from '@/store/location';
import type { Coordinate, Station } from '@/types/domain';

export const stationKeys = {
  detail: (id: string) => ['stations', id] as const,
  /** Ulke geneli TORA listesi; konumdan bagimsiz tek anahtar. */
  allTora: ['stations', 'tora'] as const,
  /** Katalog listesi konuma bagli; anahtar da oyle (bkz. useExternalStations). */
  external: (latitude: number, longitude: number) =>
    ['stations', 'external', latitude, longitude] as const,
  externalRoot: ['stations', 'external'] as const,
};

/**
 * Cevrede taranacak alan ve sayfa tavani (bkz. fetchNearbyToraStations).
 * Katalogda isletmeci filtresi olmadigi icin kayitlar sayfalanip istemcide
 * suzuluyor; 10 sayfa = en yakin 2000 kayit, Istanbul'da ~15 km'lik bir
 * cember demek ve o cemberdeki TORA istasyonlarinin hepsini yakaliyor.
 * Seyrek bolgelerde tek sayfa zaten 50 km'yi kapsiyor.
 */
const EXTERNAL_RADIUS_KM = 50;
const EXTERNAL_MAX_PAGES = 10;

/** Sunucu sonucu 10 dk onbellekliyor; istemcide daha sik sormanin anlami yok. */
const EXTERNAL_STALE_MS = 10 * 60_000;

/** Cihazdaki kopyanin omru ile ayni (bkz. services/toraStationStore). */
const STORE_MAX_AGE_MS = 24 * 60 * 60_000;

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
      fetchNearbyToraStations({ latitude, longitude }, EXTERNAL_RADIUS_KM, EXTERNAL_MAX_PAGES),
    staleTime: EXTERNAL_STALE_MS,
  });
}

/**
 * Turkiye'deki tum TORA istasyonlari. Ilk calismada katalog taraniyor (~100
 * istek), sonuc cihaza yaziliyor ve bir gun boyunca oradan okunuyor
 * (bkz. services/toraStationStore).
 */
function useAllToraStations() {
  return useQuery({
    queryKey: stationKeys.allTora,
    queryFn: async () => {
      const stored = await readStoredToraStations();
      if (stored) return stored;

      const scanned = await fetchAllToraStations();
      await writeStoredToraStations(scanned);
      return scanned;
    },
    staleTime: STORE_MAX_AGE_MS,
  });
}

/**
 * Haritadaki ve listedeki istasyonlarin TEK kaynagi EVCS katalogundaki TORA
 * istasyonlari (bkz. services/evcs.ts). Kendi backend'imizdeki demo
 * istasyonlar bilerek listelenmiyor; stationsApi.get hala duruyor - eski
 * rezervasyon ve sarj kayitlari kendi istasyon kimliklerine isaret ediyor ve o
 * ekranlar acildiginda istasyonu tek tek cozebilmeli.
 *
 * Iki sorgu birlikte calisiyor: yakin cevre birkac saniyede geliyor ve ekran
 * hemen doluyor, ulke geneli tarama bitince (ya da onbellekten aninda gelince)
 * onun yerini aliyor. Boylece kullanici ne beklemek zorunda kaliyor ne de
 * yalnizca yakindakileri goruyor.
 */
export function useStations() {
  const nearby = useExternalStations();
  const all = useAllToraStations();

  const data = all.data ?? nearby.data;

  const refetch = useCallback(async () => {
    await Promise.all([nearby.refetch(), all.refetch()]);
  }, [nearby, all]);

  return {
    data,
    // Iki kaynaktan biri geldiyse ekranda liste var; hata ancak ikisi de
    // basarisizsa gosterilmeli.
    isError: nearby.isError && all.isError,
    error: all.error ?? nearby.error,
    isLoading: data === undefined && (nearby.isLoading || all.isLoading),
    isRefetching: nearby.isRefetching || all.isRefetching,
    refetch,
  };
}

/**
 * Katalog istasyonu daha once bir listede gorulduyse detay gelene kadar onu
 * goster. Iki liste var: ulke geneli tarama ve konum cevresi (bkz. useStations).
 */
function cachedCatalogStation(
  lists: (Station[] | undefined)[],
  id: string,
): Station | undefined {
  for (const stations of lists) {
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
    // Listedeki kayit yalnizca yer tutucu: katalogda soketler sayilardan
    // uretilmis tahmin (bkz. services/evcs.ts). placeholderData oldugu icin
    // ekran aninda dolar ama detay yine de cekilir ve gercek soketler
    // tahminin uzerine yazar. (initialData olsaydi React Query tahmini taze
    // sayip detayi hic istemezdi - once oyle yazilip duzeltildi.)
    placeholderData: external
      ? cachedCatalogStation(
          [
            queryClient.getQueryData<Station[]>(stationKeys.allTora),
            ...queryClient
              .getQueriesData<Station[]>({ queryKey: stationKeys.externalRoot })
              .map(([, stations]) => stations),
          ],
          id!,
        )
      : undefined,
  });
}
