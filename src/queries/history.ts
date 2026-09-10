import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { historyApi, type CreateHistoryInput } from '@/services/api';

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
  return useQuery({
    queryKey: historyKeys.detail(id ?? ''),
    queryFn: () => historyApi.get(id!),
    enabled: !!id,
  });
}

export function useCreateHistoryEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateHistoryInput) => historyApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: historyKeys.all }),
  });
}
