import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { PaymentMethod } from '@/types/domain';

import { PERSIST_VERSION, storage } from './persist';

/**
 * Odeme yontemleri (spec bolum 12) - DEMO.
 *
 * Burada gercek kart verisi YOK ve olmayacak. Kart numarasi uygulamaya hic
 * girilmez; PCI uyumlu saglayici secildiginde kart, saglayicinin SDK'si
 * uzerinden tokenize edilecek ve biz yalnizca token + maskelenmis alanlari
 * gorecegiz (spec bolum 12 ve 26).
 *
 * Asagidaki kartlar tamamen uydurma; akisi gelistirebilmek icin varlar.
 */
const DEMO_CARDS: Omit<PaymentMethod, 'id' | 'isDefault'>[] = [
  { brand: 'Visa', last4: '4242', expiryMonth: 12, expiryYear: 2029 },
  { brand: 'Mastercard', last4: '5454', expiryMonth: 8, expiryYear: 2028 },
  { brand: 'Troy', last4: '9792', expiryMonth: 3, expiryYear: 2030 },
];

interface PaymentState {
  methods: PaymentMethod[];
  hasHydrated: boolean;

  /** Katalogdan bir demo kart ekler. */
  addDemoCard: (index: number) => void;
  remove: (id: string) => void;
  setDefault: (id: string) => void;
}

export const demoCardCatalog = DEMO_CARDS;

export const usePaymentStore = create<PaymentState>()(
  persist(
    (set) => ({
      methods: [],
      hasHydrated: false,

      addDemoCard: (index) => {
        const template = DEMO_CARDS[index];
        if (!template) return;

        set((state) => {
          const method: PaymentMethod = {
            ...template,
            id: `pm_${Date.now()}`,
            isDefault: state.methods.length === 0,
          };
          return { methods: [...state.methods, method] };
        });
      },

      remove: (id) =>
        set((state) => {
          const methods = state.methods.filter((m) => m.id !== id);
          // Varsayilan silindiyse kalanlardan ilki varsayilan olur.
          if (methods.length > 0 && !methods.some((m) => m.isDefault)) {
            methods[0] = { ...methods[0], isDefault: true };
          }
          return { methods };
        }),

      setDefault: (id) =>
        set((state) => ({
          methods: state.methods.map((m) => ({ ...m, isDefault: m.id === id })),
        })),
    }),
    {
      name: 'tora-watt-payment-demo',
      storage,
      version: PERSIST_VERSION,
      partialize: (state) => ({ methods: state.methods }),
      onRehydrateStorage: () => (state) => {
        if (state) state.hasHydrated = true;
      },
    },
  ),
);

export function selectDefaultMethod(methods: PaymentMethod[]): PaymentMethod | undefined {
  return methods.find((m) => m.isDefault) ?? methods[0];
}
