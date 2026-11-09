import { DEMO_STATIONS } from '@/data/demoStations';

/**
 * Bu surum ornek istasyonlarla calisiyor (bkz. data/demoStations): ag istegi,
 * yukleme ya da hata durumu yok. Donus bicimi sorgu sonucuyla ayni tutuluyor;
 * gercek veriye gecildiginde ekranlara dokunmadan yalnizca bu dosya degisir.
 */
export function useStations() {
  return {
    data: DEMO_STATIONS,
    isLoading: false,
    isError: false,
    error: null as Error | null,
    isRefetching: false,
    refetch: async () => {},
  };
}

export function useStation(id: string | undefined) {
  return { data: DEMO_STATIONS.find((station) => station.id === id) };
}
