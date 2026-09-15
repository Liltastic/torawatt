import { create } from 'zustand';

import {
  connectorLabels,
  type ChargingSession,
  type Connector,
  type Station,
  type Vehicle,
} from '@/types/domain';

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

/** Kullanicinin secili araci yoksa dusulen ortalama batarya kapasitesi. */
const DEFAULT_BATTERY_KWH = 60;

interface SessionMeta {
  stationName: string;
  connectorLabel: string;
  pricePerKwh: number;
  /** Oturumun tepe gucu: soket gucu ile aracin kabul ettigi gucun kucugu. */
  ratedPowerKw: number;
  /** Batarya yuzdesi ve kalan sure bu kapasiteye gore hesaplanir. */
  batteryCapacityKwh: number;
  /** Arac profili oturum basladiktan sonra gelirse tavani yeniden hesaplamak icin. */
  connector: Connector;
}

interface SessionState {
  session: ChargingSession | null;
  meta: SessionMeta | null;
  /** Simulasyonu besleyen aktif arac; yoksa ortalama varsayimlara duseriz. */
  vehicle: Vehicle | null;
  /** Oturum baslangicindan bu yana gecen simule saniye. */
  elapsedSeconds: number;

  start: (station: Station, connector: Connector) => void;
  setVehicle: (vehicle: Vehicle | null) => void;
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
/**
 * Soket etiketinde 180 kW yazsa da arac 50 kW ile siniriysa oturum 50 kW ile
 * ilerler; ayni kural rota planlayicida da uygulaniyor (services/tripPlanner).
 */
function ratedPowerFor(connector: Connector, vehicle: Vehicle | null): number {
  const vehicleMaxKw = connector.type === 'TYPE_2' ? vehicle?.maxAcKw : vehicle?.maxDcKw;
  if (!vehicleMaxKw || vehicleMaxKw <= 0) return connector.powerKw;
  return Math.min(connector.powerKw, vehicleMaxKw);
}

/** Kapasite 0 gelirse yuzde tek tikta %100 olurdu; ortalamaya duseriz. */
function capacityFor(vehicle: Vehicle | null): number {
  const capacity = vehicle?.batteryCapacityKwh ?? 0;
  return capacity > 0 ? capacity : DEFAULT_BATTERY_KWH;
}

function powerAtBattery(ratedKw: number, batteryPercent: number): number {
  if (batteryPercent >= 95) return ratedKw * 0.08;
  if (batteryPercent >= 80) return ratedKw * 0.35;
  if (batteryPercent >= 60) return ratedKw * 0.75;
  return ratedKw;
}

/**
 * Simulasyon saati gercek saatin TIME_SCALE katinda akiyor. Bitis damgasini
 * gercek duvar saatinden alirsak kayit kendi kendisiyle celisiyordu: 40 saniye
 * suren bir oturum makbuza "Baslangic 14:03 / Bitis 14:04 / Sure 40 dk" olarak
 * basiliyordu (bkz. services/invoice.ts). Bitisi simule sureden tureterek
 * endedAt - startedAt == sure esitligini koruyoruz.
 */
function simulatedEnd(startedAt: string, elapsedSeconds: number): string {
  return new Date(new Date(startedAt).getTime() + elapsedSeconds * 1000).toISOString();
}

export const useSessionStore = create<SessionState>((set, get) => ({
  session: null,
  meta: null,
  vehicle: null,
  elapsedSeconds: 0,

  start: (station, connector) => {
    stopTimer();

    const { vehicle } = get();
    const startedAt = new Date().toISOString();
    set({
      elapsedSeconds: 0,
      meta: {
        stationName: station.name,
        connectorLabel: `${connectorLabels[connector.type]} · ${connector.powerKw} kW`,
        pricePerKwh: connector.pricePerKwh ?? 0,
        ratedPowerKw: ratedPowerFor(connector, vehicle),
        batteryCapacityKwh: capacityFor(vehicle),
        connector,
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

      const nextBattery = Math.min(
        100,
        battery + (powerKw * hours * 100) / meta.batteryCapacityKwh,
      );
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
          endedAt: finished ? simulatedEnd(session.startedAt, elapsedSeconds + TIME_SCALE) : undefined,
        },
      });

      if (finished) stopTimer();
    }, TICK_MS);
  },

  /**
   * Store React Query'ye erisemedigi icin aktif araci disaridan aliyor
   * (bkz. src/app/(tabs)/charging.tsx). Sarj sekmesi ilk oturumla birlikte
   * mount oldugundan arac bilgisi oturum basladiktan hemen sonra gelebilir;
   * o yuzden devam eden oturumun kapasitesini ve guc tavanini da guncelliyoruz.
   */
  setVehicle: (vehicle) => {
    const { vehicle: current, session, meta } = get();
    if (current === vehicle) return;

    if (!session || !meta || session.status === 'COMPLETED') {
      set({ vehicle });
      return;
    }

    set({
      vehicle,
      meta: {
        ...meta,
        ratedPowerKw: ratedPowerFor(meta.connector, vehicle),
        batteryCapacityKwh: capacityFor(vehicle),
      },
    });
  },

  stop: () => {
    stopTimer();
    const { session } = get();
    if (!session || session.status === 'COMPLETED') return;

    set({
      session: {
        ...session,
        status: 'COMPLETED',
        endedAt: simulatedEnd(session.startedAt, get().elapsedSeconds),
      },
    });
  },

  clear: () => {
    stopTimer();
    set({ session: null, meta: null, elapsedSeconds: 0 });
  },
}));
