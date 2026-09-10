import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Vehicle } from '@/types/domain';

import { PERSIST_VERSION, storage } from './persist';

/**
 * Kullanicinin araclari (spec bolum 14).
 * Cihazda saklanir; backend /vehicles ucu baglandiginda sunucu ile eslenecek.
 */
interface VehicleState {
  vehicles: Vehicle[];
  /** Filtreleme ve rota onerilerinde kullanilacak arac. */
  activeVehicleId?: string;

  /** Kalici veri yuklendi mi; yuklenmeden "arac yok" gostermek yaniltici. */
  hasHydrated: boolean;

  add: (vehicle: Omit<Vehicle, 'id'>) => Vehicle;
  remove: (id: string) => void;
  setActive: (id: string) => void;
}

export const useVehicleStore = create<VehicleState>()(
  persist(
    (set) => ({
      vehicles: [],
      activeVehicleId: undefined,
      hasHydrated: false,

      add: (input) => {
        const vehicle: Vehicle = { ...input, id: `veh_${Date.now()}` };
        set((state) => ({
          vehicles: [...state.vehicles, vehicle],
          // Ilk arac otomatik aktif olur; kullanici ayrica secmek zorunda kalmasin.
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
    }),
    {
      name: 'tora-watt-vehicles',
      storage,
      version: PERSIST_VERSION,
      // Yalnizca veriyi sakla; aksiyonlar serilestirilemez.
      partialize: (state) => ({
        vehicles: state.vehicles,
        activeVehicleId: state.activeVehicleId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hasHydrated = true;
      },
    },
  ),
);
