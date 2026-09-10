import { useQuery } from '@tanstack/react-query';

import { stationsApi } from '@/services/api';

export const stationKeys = {
  all: ['stations'] as const,
  detail: (id: string) => ['stations', id] as const,
};

/** Istasyon listesi degisimi (musaitlik) sik olabilir; 15 sn'de bir tazelenir. */
export function useStations() {
  return useQuery({
    queryKey: stationKeys.all,
    queryFn: stationsApi.list,
    staleTime: 15_000,
  });
}

export function useStation(id: string | undefined) {
  return useQuery({
    queryKey: stationKeys.detail(id ?? ''),
    queryFn: () => stationsApi.get(id!),
    enabled: !!id,
    staleTime: 15_000,
  });
}
