import { create } from 'zustand';

import type { Vehicle } from '@/types/domain';

/**
 * Kullanicinin araclari (spec bolum 14).
 *
 * GECICI: bellekte tutuluyor; backend /vehicles ucu baglanana kadar
 * uygulama yeniden yuklendiginde sifirlanir.
 */
interface VehicleState {
  vehicles: Vehicle[];
  /** Filtreleme ve rota onerilerinde kullanilacak arac. */
  activeVehicleId?: string;

  add: (vehicle: Omit<Vehicle, 'id'>) => Vehicle;
  remove: (id: string) => void;
  setActive: (id: string) => void;
  activeVehicle: () => Vehicle | undefined;
}

export const useVehicleStore = create<VehicleState>((set, get) => ({
  vehicles: [],
  activeVehicleId: undefined,

  add: (input) => {
    const vehicle: Vehicle = { ...input, id: `veh_${Date.now()}` };
    set((state) => ({
      vehicles: [...state.vehicles, vehicle],
      // Ilk arac otomatik olarak aktif olur; kullanici ayrica secmek zorunda kalmasin.
      activeVehicleId: state.activeVehicleId ?? vehicle.id,
    }));
    return vehicle;
  },

  remove: (id) =>
    set((state) => {
      const vehicles = state.vehicles.filter((v) => v.id !== id);
      return {
        vehicles,
        activeVehicleId:
          state.activeVehicleId === id ? vehicles[0]?.id : state.activeVehicleId,
      };
    }),

  setActive: (id) => set({ activeVehicleId: id }),

  activeVehicle: () => {
    const { vehicles, activeVehicleId } = get();
    return vehicles.find((v) => v.id === activeVehicleId);
  },
}));

/**
 * Bir istasyonun soketlerinden en az biri araca uyuyor mu?
 * Hem fis tipi hem de aracin kabul ettigi guc dikkate alinir.
 */
export function vehicleSupportsConnector(
  vehicle: Vehicle,
  connector: { type: Vehicle['connectors'][number]; powerKw: number },
): boolean {
  return vehicle.connectors.includes(connector.type);
}
