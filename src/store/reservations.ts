import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  effectiveReservationStatus,
  type Connector,
  type ReservationDetail,
  type Station,
} from '@/types/domain';

import { PERSIST_VERSION, storage } from './persist';

/**
 * Rezervasyonlar (spec bolum 10).
 *
 * GECICI: onay simule ediliyor. Gercekte POST /reservations cagrilacak ve
 * durum sunucudan gelecek; soketi baskasi kapmis olabilir.
 *
 * Durum makinesi: draft -> pending -> confirmed -> arrived
 *                              \-> expired / cancelled
 * EXPIRED kaydedilmiyor, sureye bakilarak hesaplaniyor
 * (bkz. effectiveReservationStatus).
 */
interface ReservationState {
  items: ReservationDetail[];
  hasHydrated: boolean;

  create: (
    station: Station,
    connector: Connector,
    startsAt: Date,
    durationMinutes: number,
  ) => ReservationDetail;
  confirm: (id: string) => void;
  cancel: (id: string) => void;
  markArrived: (id: string) => void;
  findById: (id: string) => ReservationDetail | undefined;
}

const patch = (id: string, changes: Partial<ReservationDetail>) => (state: ReservationState) => ({
  items: state.items.map((r) => (r.id === id ? { ...r, ...changes } : r)),
});

export const useReservationStore = create<ReservationState>()(
  persist(
    (set, get) => ({
      items: [],
      hasHydrated: false,

      create: (station, connector, startsAt, durationMinutes) => {
        const reservation: ReservationDetail = {
          id: `res_${Date.now()}`,
          stationId: station.id,
          connectorId: connector.id,
          stationName: station.name,
          connectorLabel: `${connector.type} · ${connector.powerKw} kW`,
          startsAt: startsAt.toISOString(),
          durationMinutes,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        };

        set((state) => ({ items: [reservation, ...state.items] }));
        return reservation;
      },

      confirm: (id) => set(patch(id, { status: 'CONFIRMED' })),
      cancel: (id) => set(patch(id, { status: 'CANCELLED' })),
      markArrived: (id) => set(patch(id, { status: 'ARRIVED' })),

      findById: (id) => get().items.find((r) => r.id === id),
    }),
    {
      name: 'tora-watt-reservations',
      storage,
      version: PERSIST_VERSION,
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hasHydrated = true;
      },
    },
  ),
);

/** Kullanicinin su an takip etmesi gereken rezervasyon, yoksa undefined. */
export function selectActiveReservation(
  items: ReservationDetail[],
): ReservationDetail | undefined {
  return items
    .filter((r) => {
      const status = effectiveReservationStatus(r);
      return status === 'PENDING' || status === 'CONFIRMED' || status === 'ARRIVED';
    })
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0];
}
