import { create } from 'zustand';

/**
 * Baska bir ekrandan (favoriler, gecmis...) "bu istasyonu haritada ac" istegi.
 *
 * Neden URL parametresi degil: /map?stationId=... ile gidince Expo Router
 * sekme ekranini yeniden kuruyor ve harita WebView'i sifirdan yukleniyordu
 * (~3 sn bos ekran). Istek burada tutulup sekmeye normal gecis yapilinca
 * harita oldugu gibi kaliyor; harita ekrani istegi okuyup tuketiyor.
 */
interface MapIntentState {
  stationId?: string;
  openStation: (stationId: string) => void;
  consume: () => void;
}

export const useMapIntentStore = create<MapIntentState>((set) => ({
  stationId: undefined,
  openStation: (stationId) => set({ stationId }),
  consume: () => set({ stationId: undefined }),
}));
