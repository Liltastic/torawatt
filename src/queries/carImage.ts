import { useQuery } from '@tanstack/react-query';

import { fetchCarImageUrl } from '@/services/carImage';
import type { Vehicle } from '@/types/domain';

/**
 * Imza yaklasik bir gun gecerli; URL'yi o sureden belirgin olcude once
 * tazeliyoruz ki ekranda suresi dolmus bir baglanti kalmasin.
 */
const STALE_MS = 12 * 60 * 60_000;

export const carImageKeys = {
  forVehicle: (make: string, model: string, modelYear: number) =>
    ['car-image', make, model, modelYear] as const,
};

/** Aracin katalog gorseli; yoksa undefined doner ve kart yazilarla kalir. */
export function useCarImage(vehicle: Pick<Vehicle, 'make' | 'model' | 'modelYear'>) {
  return useQuery({
    queryKey: carImageKeys.forVehicle(vehicle.make, vehicle.model, vehicle.modelYear),
    queryFn: () =>
      fetchCarImageUrl({
        make: vehicle.make,
        model: vehicle.model,
        modelYear: vehicle.modelYear,
        width: 600,
      }),
    staleTime: STALE_MS,
    // Gorsel olmadan da ekran calisiyor; bos sonucu tekrar tekrar denemeyelim.
    retry: false,
  });
}
