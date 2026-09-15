import { useQuery, useQueryClient } from '@tanstack/react-query';

import { stationsApi } from '@/services/api';
import type { Station } from '@/types/domain';

export const stationKeys = {
  all: ['stations'] as const,
  detail: (id: string) => ['stations', id] as const,
};

/**
 * Musaitlik 15 sn sonra bayat sayilir ama staleTime TEK BASINA refetch
 * tetiklemez: pratikte tazeleme yalnizca yeni bir mount ile oluyor.
 * refetchOnWindowFocus/refetchOnReconnect RN'de islevsiz - React Query'nin
 * focusManager/onlineManager koprusu AppState/NetInfo'ya baglanmadigi surece
 * isFocused()/isOnline() sabit true doner - ve Harita sekmesi oturum boyunca
 * mount kaldigi icin liste orada donuk kalir. Periyodik poll bilerek
 * eklenmedi: sunucudaki musaitlik su an statik seed verisi, degisen bir sey
 * yok. Canli musaitlik geldiginde refetchInterval buraya eklenmeli.
 */
export function useStations() {
  return useQuery({
    queryKey: stationKeys.all,
    queryFn: stationsApi.list,
    staleTime: 15_000,
  });
}

export function useStation(id: string | undefined) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: stationKeys.detail(id ?? ''),
    queryFn: () => stationsApi.get(id!),
    enabled: !!id,
    staleTime: 15_000,
    // Liste ve detay ucu ayni serializeStation ciktisini (connectors dahil)
    // donduruyor; istasyon zaten cache'teyken "Sarj Baslat"/"Rezerve Et"
    // ekranlarinda tam ekran spinner gostermenin anlami yok.
    // initialDataUpdatedAt olmadan veri sonsuza kadar taze sayilirdi; listenin
    // gercek yasini verdigimiz icin bayatsa arka planda yine tazeleniyor.
    initialData: () =>
      queryClient.getQueryData<Station[]>(stationKeys.all)?.find((s) => s.id === id),
    initialDataUpdatedAt: () => queryClient.getQueryState(stationKeys.all)?.dataUpdatedAt,
  });
}
