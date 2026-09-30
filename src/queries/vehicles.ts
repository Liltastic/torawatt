import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { vehiclesApi, type CreateVehicleInput } from '@/services/api';
import type { Vehicle } from '@/types/domain';

export const vehicleKeys = {
  all: ['vehicles'] as const,
};

export function useVehicles() {
  return useQuery({
    queryKey: vehicleKeys.all,
    queryFn: vehiclesApi.list,
  });
}

/** Listedeki aktif araci dondurur; bulunamazsa undefined (henuz arac yok). */
export function useActiveVehicle(): Vehicle | undefined {
  const { data } = useVehicles();
  return data?.find((v) => v.isActive);
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateVehicleInput) => vehiclesApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vehicleKeys.all }),
  });
}

/**
 * Iyimser guncelleme icin ortak kalip.
 *
 * Bunlar olmadan ekran, dokunustan sonra IKI tur ag trafigi bekliyordu:
 * once sunucunun cevabi, sonra listenin yeniden cekilmesi. "Aktif" rozeti
 * ancak ondan sonra yer degistiriyordu; backend uykudan kalkiyorsa bu
 * saniyeler suruyor ve dokunus cevapsiz kalmis gibi hissettiriyor.
 *
 * Simdi degisiklik onbellege aninda yaziliyor, istek arkada gidiyor. Istek
 * duserse onceki liste geri konuyor ve ekran kullaniciya hatayi gosteriyor
 * (bkz. app/vehicles/index.tsx failWith).
 */
function optimisticVehicles(
  queryClient: ReturnType<typeof useQueryClient>,
  update: (vehicles: Vehicle[], id: string) => Vehicle[],
) {
  return {
    onMutate: async (id: string) => {
      // Ucustaki bir sorgu iyimser degisikligin uzerine yazmasin.
      await queryClient.cancelQueries({ queryKey: vehicleKeys.all });
      const previous = queryClient.getQueryData<Vehicle[]>(vehicleKeys.all);
      if (previous) queryClient.setQueryData<Vehicle[]>(vehicleKeys.all, update(previous, id));
      return { previous };
    },
    onError: (_error: unknown, _id: string, context?: { previous?: Vehicle[] }) => {
      if (context?.previous) queryClient.setQueryData(vehicleKeys.all, context.previous);
    },
    // Basarida da hatada da sunucuyla uzlas.
    onSettled: () => queryClient.invalidateQueries({ queryKey: vehicleKeys.all }),
  };
}

export function useActivateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vehiclesApi.activate(id),
    ...optimisticVehicles(queryClient, (vehicles, id) =>
      // Aktiflik tekil: secilen aktif olurken digerleri birakilmali, yoksa
      // iki karti da "Aktif" rozetiyle gosteren bir an olusuyor.
      vehicles.map((vehicle) => ({ ...vehicle, isActive: vehicle.id === id })),
    ),
  });
}

export function useRemoveVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vehiclesApi.remove(id),
    ...optimisticVehicles(queryClient, (vehicles, id) =>
      vehicles.filter((vehicle) => vehicle.id !== id),
    ),
  });
}
