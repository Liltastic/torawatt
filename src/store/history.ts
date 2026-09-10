import { create } from 'zustand';

import { seedHistory } from '@/mocks/history';
import type { ChargingHistoryDetail } from '@/types/domain';

/**
 * Sarj gecmisi (spec bolum 13).
 *
 * GECICI: liste backend'deki /charging-history ucundan gelene kadar bellekte
 * tutuluyor ve ornek kayitlarla basliyor. Uygulama yeniden yuklenince
 * simulasyonda tamamlanan oturumlar kaybolur; kalicilik backend ile gelecek.
 */
interface HistoryState {
  items: ChargingHistoryDetail[];
  add: (item: ChargingHistoryDetail) => void;
  findById: (id: string) => ChargingHistoryDetail | undefined;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  items: seedHistory,

  add: (item) => set((state) => ({ items: [item, ...state.items] })),

  findById: (id) => get().items.find((item) => item.id === id),
}));
