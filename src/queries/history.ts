import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { historyApi, type CreateHistoryInput } from '@/services/api';
import type { ChargingHistoryDetail } from '@/types/domain';

export const historyKeys = {
  all: ['charging-history'] as const,
  detail: (id: string) => ['charging-history', id] as const,
};

export function useChargingHistory() {
  return useQuery({
    queryKey: historyKeys.all,
    queryFn: historyApi.list,
  });
}

export function useChargingHistoryEntry(id: string | undefined) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: historyKeys.detail(id ?? ''),
    queryFn: () => historyApi.get(id!),
    enabled: !!id,
    // Liste zaten ayni ChargingHistoryDetail nesnesini tasiyor; listeden
    // acilan detay spinner gostermesin. Yas bilgisini de listeden aliyoruz ki
    // bayat veri arka planda yine tazelensin.
    initialData: () =>
      queryClient.getQueryData<ChargingHistoryDetail[]>(historyKeys.all)?.find((e) => e.id === id),
    initialDataUpdatedAt: () => queryClient.getQueryState(historyKeys.all)?.dataUpdatedAt,
  });
}

export function useCreateHistoryEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateHistoryInput) => historyApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: historyKeys.all }),
  });
}
