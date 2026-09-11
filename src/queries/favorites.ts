import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { favoritesApi } from '@/services/api';

export const favoriteKeys = {
  all: ['favorites'] as const,
};

export function useFavoriteIds() {
  return useQuery({
    queryKey: favoriteKeys.all,
    queryFn: favoritesApi.list,
  });
}

export function useIsFavorite(stationId: string | undefined): boolean {
  const { data } = useFavoriteIds();
  return !!stationId && (data ?? []).includes(stationId);
}

/**
 * Kalbe dokunuldugunda aninda tepki versin diye iyimser guncelleme: once
 * cache degisir, istek basarisiz olursa eski liste geri yuklenir.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ stationId, favorite }: { stationId: string; favorite: boolean }) =>
      favorite ? favoritesApi.add(stationId) : favoritesApi.remove(stationId),

    onMutate: async ({ stationId, favorite }) => {
      await queryClient.cancelQueries({ queryKey: favoriteKeys.all });
      const previous = queryClient.getQueryData<string[]>(favoriteKeys.all) ?? [];
      const next = favorite
        ? [stationId, ...previous.filter((id) => id !== stationId)]
        : previous.filter((id) => id !== stationId);
      queryClient.setQueryData(favoriteKeys.all, next);
      return { previous };
    },

    onError: (_error, _input, context) => {
      if (context) queryClient.setQueryData(favoriteKeys.all, context.previous);
    },

    onSettled: () => queryClient.invalidateQueries({ queryKey: favoriteKeys.all }),
  });
}
