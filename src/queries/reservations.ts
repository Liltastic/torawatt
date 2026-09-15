import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { reservationsApi, type CreateReservationInput } from '@/services/api';
import { effectiveReservationStatus, type ReservationDetail, type ReservationStatus } from '@/types/domain';

export const reservationKeys = {
  all: ['reservations'] as const,
};

export function useReservations() {
  return useQuery({
    queryKey: reservationKeys.all,
    queryFn: reservationsApi.list,
    // Bekleme suresi dolan rezervasyon EXPIRED'a donsun diye periyodik tazeleme:
    // sunucu da EXPIRED'i saatten turetiyor (server/src/lib/serialize.ts), yani
    // sure dolunca yanit gercekten degisir ve haritadaki "aktif rezervasyon"
    // bandi yeniden render ile kaybolur. Poll yalnizca beklemede bir rezervasyon
    // varken calisir; rezervasyonu olmayan kullanici - cogunluk - Harita sekmesi
    // oturum boyunca mount kaldigi halde tek bir gereksiz istek atmaz.
    // ARRIVED disarida: o durum hic EXPIRED'a donmuyor, poll sonsuza kadar surerdi.
    refetchInterval: (query) =>
      (query.state.data ?? []).some((r) => {
        const status = effectiveReservationStatus(r);
        return status === 'PENDING' || status === 'CONFIRMED';
      })
        ? 30_000
        : false,
  });
}

/** Kullanicinin su an takip etmesi gereken rezervasyon, yoksa undefined. */
export function useActiveReservation(): ReservationDetail | undefined {
  const { data } = useReservations();
  if (!data) return undefined;

  return data
    .filter((r) => {
      const status = effectiveReservationStatus(r);
      return status === 'PENDING' || status === 'CONFIRMED' || status === 'ARRIVED';
    })
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0];
}

export function useCreateReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReservationInput) => reservationsApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reservationKeys.all }),
  });
}

export function useSetReservationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: Extract<ReservationStatus, 'CONFIRMED' | 'ARRIVED' | 'CANCELLED'>;
    }) => reservationsApi.setStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reservationKeys.all }),
  });
}
