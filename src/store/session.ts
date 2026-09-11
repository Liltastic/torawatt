import { create } from 'zustand';

import { connectorLabels, type ChargingSession, type Connector, type Station } from '@/types/domain';

/**
 * GECICI: aktif sarj oturumu simule ediliyor.
 *
 * Spec bolum 23'e gore gercek uygulamada bu veri WebSocket / SSE ile
 * CHARGING_SESSION_UPDATED eventlerinden gelecek. Buradaki tick yalnizca
 * backend hazir olana kadar aktif sarj ekranini gelistirebilmek icin var.
 *
 * Bu store gecmise yazma islemi YAPMAZ: oturum COMPLETED olunca
 * src/app/(tabs)/charging.tsx, useCreateHistoryEntry ile backend'e POST
 * atip React Query cache'ini gecersiz kilar. Sorumluluk boyle ayrilinca bu
 * dosya API'den tamamen bagimsiz, test edilmesi kolay bir simulasyon olarak kalir.
 */

/** Simulasyon hizi: gercek zamanin kac katinda ilerlesin. */
const TIME_SCALE = 60;
const TICK_MS = 1000;

interface SessionMeta {
  stationName: string;
  connectorLabel: string;
  pricePerKwh: number;
  ratedPowerKw: number;
}

interface SessionState {
  session: ChargingSession | null;
  meta: SessionMeta | null;
  /** Oturum baslangicindan bu yana gecen simule saniye. */
  elapsedSeconds: number;

  start: (station: Station, connector: Connector) => void;
  stop: () => void;
  clear: () => void;
}

let timer: ReturnType<typeof setInterval> | null = null;

const stopTimer = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
};

/**
 * Batarya doldukca sarj gucu duser; gercek EV egrisine kaba bir yaklasim.
 * %80 sonrasi belirgin sekilde yavaslar.
 */
function powerAtBattery(ratedKw: number, batteryPercent: number): number {
  if (batteryPercent >= 95) return ratedKw * 0.08;
  if (batteryPercent >= 80) return ratedKw * 0.35;
  if (batteryPercent >= 60) return ratedKw * 0.75;
  return ratedKw;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  session: null,
  meta: null,
  elapsedSeconds: 0,

  start: (station, connector) => {
    stopTimer();

    const startedAt = new Date().toISOString();
    set({
      elapsedSeconds: 0,
      meta: {
        stationName: station.name,
        connectorLabel: `${connectorLabels[connector.type]} · ${connector.powerKw} kW`,
        pricePerKwh: connector.pricePerKwh ?? 0,
        ratedPowerKw: connector.powerKw,
      },
      session: {
        id: `sess_${Date.now()}`,
        stationId: station.id,
        connectorId: connector.id,
        startedAt,
        energyKwh: 0,
        powerKw: 0,
        cost: 0,
        batteryPercent: 28,
        status: 'STARTING',
      },
    });

    timer = setInterval(() => {
      const { session, meta, elapsedSeconds } = get();
      if (!session || !meta) return;

      // Ilk birkac saniye el sikisma; sonra sarja gecer.
      if (session.status === 'STARTING') {
        if (elapsedSeconds < 3) {
          set({ elapsedSeconds: elapsedSeconds + 1 });
          return;
        }
        set({ session: { ...session, status: 'CHARGING' } });
        return;
      }

      if (session.status !== 'CHARGING') return;

      const battery = session.batteryPercent ?? 0;
      const powerKw = powerAtBattery(meta.ratedPowerKw, battery);

      // TICK_MS gercek zaman, TIME_SCALE katinda simule saat.
      const hours = (TICK_MS / 1000 / 3600) * TIME_SCALE;
      const energyKwh = session.energyKwh + powerKw * hours;

      // 60 kWh'lik ortalama bir batarya varsayimi.
      const nextBattery = Math.min(100, battery + (powerKw * hours * 100) / 60);
      const finished = nextBattery >= 100;

      set({
        elapsedSeconds: elapsedSeconds + TIME_SCALE,
        session: {
          ...session,
          powerKw,
          energyKwh,
          batteryPercent: nextBattery,
          cost: energyKwh * meta.pricePerKwh,
          status: finished ? 'COMPLETED' : 'CHARGING',
          endedAt: finished ? new Date().toISOString() : undefined,
        },
      });

      if (finished) stopTimer();
    }, TICK_MS);
  },

  stop: () => {
    stopTimer();
    const { session } = get();
    if (!session || session.status === 'COMPLETED') return;

    set({
      session: {
        ...session,
        status: 'COMPLETED',
        endedAt: new Date().toISOString(),
      },
    });
  },

  clear: () => {
    stopTimer();
    set({ session: null, meta: null, elapsedSeconds: 0 });
  },
}));
