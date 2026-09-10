import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { reservationsApi, type CreateReservationInput } from '@/services/api';
import { effectiveReservationStatus, type ReservationDetail, type ReservationStatus } from '@/types/domain';

export const reservationKeys = {
  all: ['reservations'] as const,
};

export function useReservations() {
  return useQuery({
    queryKey: reservationKeys.all,
    // Bekleme suresi dolan rezervasyon EXPIRED'a donsun diye periyodik tazeleme;
    // effectiveReservationStatus zaten anlik hesapliyor ama liste ekrandaki
    // "aktif rezervasyon" bandinin kaybolmasi icin yeniden render tetiklemek gerek.
    refetchInterval: 30_000,
    queryFn: reservationsApi.list,
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
