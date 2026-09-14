import { create } from 'zustand';

import type { BasemapId } from '@/map/mapHtml';

/**
 * Kullanicinin sectigi taban harita (haritadaki katman butonu).
 *
 * Uygulama genelinde tek bir tercih: harita sekmesinde secilen gorunum rota
 * onizlemesinde de gecerli olsun. Kasitli olarak kalici degil - acilista
 * SecureStore'dan okunmasi WebView'in once bir stille acilip hemen digerine
 * gecmesine (ve bastan yuklenmesine) yol acardi.
 */
interface MapStyleState {
  basemap: BasemapId;
  toggle: () => void;
}

export const useMapStyleStore = create<MapStyleState>((set) => ({
  basemap: 'studio',
  toggle: () => set((state) => ({ basemap: state.basemap === 'studio' ? 'classic' : 'studio' })),
}));
