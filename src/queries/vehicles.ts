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

export function useActivateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vehiclesApi.activate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vehicleKeys.all }),
  });
}

export function useRemoveVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vehiclesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: vehicleKeys.all }),
  });
}
