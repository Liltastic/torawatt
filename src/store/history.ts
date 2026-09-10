import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { seedHistory } from '@/mocks/history';
import type { ChargingHistoryDetail } from '@/types/domain';

import { PERSIST_VERSION, storage } from './persist';

/**
 * Sarj gecmisi (spec bolum 13).
 *
 * GECICI: liste ornek kayitlarla basliyor ve cihazda saklaniyor. Backend
 * /charging-history ucu hazir olunca dogruluk kaynagi sunucu olacak ve
 * seedHistory silinecek.
 */
interface HistoryState {
  items: ChargingHistoryDetail[];
  add: (item: ChargingHistoryDetail) => void;
  findById: (id: string) => ChargingHistoryDetail | undefined;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      items: seedHistory,

      add: (item) => set((state) => ({ items: [item, ...state.items] })),

      findById: (id) => get().items.find((entry) => entry.id === id),
    }),
    {
      name: 'tora-watt-history',
      storage,
      version: PERSIST_VERSION,
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
