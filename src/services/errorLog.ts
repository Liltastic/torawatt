import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { File, Paths } from 'expo-file-system';
import * as Updates from 'expo-updates';
import { AppState, Platform, type ErrorUtils } from 'react-native';

import { API_BASE_URL } from './config';

/**
 * Uygulama hata kaydi.
 *
 * Yakalanmamis JS hatalarini, ekran cizim hatalarini (kok ErrorBoundary, bkz.
 * app/_layout.tsx), yakalanmamis promise redlerini ve haritanin WebView
 * icinden bildirdigi hatalari sunucuya gonderir (POST /client-errors). Sunucu
 * bunlari kendi loguna yazar: Render panelinde Logs sekmesinde
 * "[client-error]" ile aranir.
 *
 * Native SDK'li bir hata servisi Expo Go'da kurulamiyor; iPhone'daki sorunlar
 * bugune kadar ancak ekrana basilan uyarilar ve ekran goruntuleriyle
 * ayiklanabiliyordu. Sinir: uygulamanin native tarafta olmesi (ornegin iOS'un
 * bellek yuzunden oldurmesi) JS'e hic ulasmadigi icin bu kayda dusmez.
 */

/**
 * Metro'ya bagli gelistirmede hatalar zaten LogBox'ta ve terminalde; canli
 * sunucunun loguna gelistirme gurultusu karismasin.
 */
const ENABLED = !__DEV__;
const ENDPOINT = `${API_BASE_URL}/client-errors`;

const MAX_MESSAGE = 500;
const MAX_STACK = 3000;
const MAX_COMPONENT_STACK = 1500;
const MAX_CONTEXT_VALUE = 200;

/**
 * Ayni hata bu sure icinde tekrar gelirse (her karede patlayan bir sey gibi)
 * bir kez yazilir. Karsilastirmada rakamlar yok sayiliyor: haritanin karo
 * hatalari her koordinat icin ayri bir adresle geliyor ve ayni arizaydi.
 */
const DEDUPE_WINDOW_MS = 60_000;
/** Tek acilista en fazla bu kadar kayit: bir hata dongusu log yagdirmasin. */
const MAX_REPORTS_PER_LAUNCH = 40;
/**
 * Harita kaynakli olanlarin payi: dengesiz bir karo sunucusu tek basina butun
 * kotayi doldurup asil uygulama hatalarini disarida birakmasin.
 */
const MAX_MAP_REPORTS_PER_LAUNCH = 15;
/** Gonderilemeyip bekleyen kayit siniri; asilirsa en eskiler duser. */
const MAX_PENDING = 20;
/** Tek istekteki kayit sayisi; govde sunucunun 100 KB JSON sinirinin cok altinda kalir. */
const BATCH_SIZE = 5;
/** Ard arda gelen hatalar tek istekte gitsin. */
const FLUSH_DELAY_MS = 2_000;
/** Render'in ucretsiz katmani uyurken uyanmasi 30 sn'yi asabiliyor (bkz. api.ts). */
const REQUEST_TIMEOUT_MS = 60_000;
/** Basarisiz bir gonderimden sonra en erken bu kadar sure sonra tekrar denenir. */
const RETRY_AFTER_MS = 30_000;

/**
 * Olumcul hatada bekleyen kayitlar buraya SENKRON yaziliyor: uygulama hemen
 * ardindan kapanabilir ve yoldaki istek hic tamamlanmayabilir. Bir sonraki
 * acilista okunup gonderilir.
 */
const PENDING_FILE_NAME = 'error-log-pending.json';

export type ErrorSource = 'js' | 'render' | 'promise' | 'map';

type ContextValue = string | number | boolean;

interface ErrorReport {
  source: ErrorSource;
  fatal: boolean;
  message: string;
  stack?: string;
  componentStack?: string;
  route?: string;
  userId?: string;
  context?: Record<string, ContextValue>;
  occurredAt: string;
}

export interface LogErrorOptions {
  source: ErrorSource;
  /** Uygulamanin devam edemedigi hata (React Native'in "fatal" dedigi). */
  fatal?: boolean;
  /** Hatayi ayiklamaya yarayan kisa bilgiler; ornegin haritanin taban katmani. */
  context?: Record<string, ContextValue | undefined>;
}

interface HermesInternal {
  enablePromiseRejectionTracker?: (options: {
    allRejections: boolean;
    onUnhandled: (id: number, rejection: unknown) => void;
    onHandled: (id: number) => void;
  }) => void;
}

let currentRoute: string | undefined;
let currentUserId: string | undefined;

let reportsThisLaunch = 0;
let mapReportsThisLaunch = 0;
const lastSeenAt = new Map<string, number>();

let pending: ErrorReport[] = [];
/** Bekleyen kayitlarin diskte de bir kopyasi var mi. */
let persisted = false;
let flushing = false;
let flushTimer: ReturnType<typeof setTimeout> | undefined;
let lastFailureAt = 0;

/** Hata hangi ekrandayken olustu; kok layout her gezinmede gunceller. */
export function setErrorLogRoute(route: string) {
  currentRoute = route;
}

/** Oturum acik kullanicinin kimligi (e-posta degil); cikista undefined. */
export function setErrorLogUser(userId: string | undefined) {
  currentUserId = userId;
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

/**
 * Mapbox karo/stil adresleri erisim anahtarini sorgu parametresi olarak
 * tasiyor ve harita hatalari adresi mesaja ekliyor (bkz. map/mapHtml.ts).
 * Anahtar loga yazilmasin.
 */
function redact(value: string): string {
  return value.replace(/access_token=[^&\s"')]+/g, 'access_token=***');
}

function describe(error: unknown): Pick<ErrorReport, 'message' | 'stack' | 'componentStack'> {
  if (error instanceof Error) {
    // React Native cizim hatalarina bilesen yigitini bu alana ekliyor.
    const componentStack = (error as { componentStack?: unknown }).componentStack;
    const prefix = error.name && error.name !== 'Error' ? `${error.name}: ` : '';
    return {
      message: truncate(
        redact(`${prefix}${error.message}` || error.name || 'Bilinmeyen hata'),
        MAX_MESSAGE,
      ),
      stack: error.stack ? truncate(redact(error.stack), MAX_STACK) : undefined,
      componentStack:
        typeof componentStack === 'string' && componentStack.trim()
          ? truncate(componentStack.trim(), MAX_COMPONENT_STACK)
          : undefined,
    };
  }

  // Error olmayan degerler de firlatilabiliyor: throw 'metin', reject(undefined) gibi.
  let message: string;
  if (typeof error === 'string') {
    message = error;
  } else {
    try {
      message = JSON.stringify(error) ?? String(error);
    } catch {
      message = String(error);
    }
  }
  return { message: truncate(redact(message || 'Bilinmeyen hata'), MAX_MESSAGE) };
}

function cleanContext(context: LogErrorOptions['context']): ErrorReport['context'] {
  if (!context) return undefined;
  const entries = Object.entries(context).flatMap(([key, value]): [string, ContextValue][] =>
    value === undefined
      ? []
      : [[key, typeof value === 'string' ? truncate(redact(value), MAX_CONTEXT_VALUE) : value]],
  );
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function clientInfo() {
  return {
    platform: `${Platform.OS} ${Device.osVersion ?? Platform.Version}`,
    device: Device.modelName ?? undefined,
    appVersion: Constants.expoConfig?.version,
    updateId: Updates.updateId ?? undefined,
    channel: Updates.channel ?? undefined,
    runtime:
      Constants.executionEnvironment === ExecutionEnvironment.StoreClient
        ? 'expo-go'
        : Constants.executionEnvironment,
  };
}

function pendingFile(): File {
  return new File(Paths.document, PENDING_FILE_NAME);
}

function persistPending() {
  try {
    pendingFile().write(JSON.stringify(pending));
    persisted = true;
  } catch {
    // Diske yazilamazsa kayitlar bellekte kalir; uygulama ayakta kalirsa yine gider.
  }
}

function clearPersisted() {
  try {
    const file = pendingFile();
    if (file.exists) file.delete();
  } catch {
    // Silinemeyen dosya bir sonraki acilista tekrar gonderilir; sunucu tarafinda zararsiz.
  }
  persisted = false;
}

function restorePersisted() {
  try {
    const file = pendingFile();
    if (!file.exists) return;
    const saved: unknown = JSON.parse(file.textSync());
    if (Array.isArray(saved) && saved.length > 0) {
      pending = [...(saved as ErrorReport[]), ...pending].slice(-MAX_PENDING);
      // Dosya, kayitlar gercekten gidene kadar kaliyor: bu acilis da gondermeden
      // kapanirsa kaybolmasinlar.
      persisted = true;
    } else {
      clearPersisted();
    }
  } catch {
    // Bozuk dosya her acilista ayni hatayi vermesin.
    clearPersisted();
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = undefined;
    void flush();
  }, FLUSH_DELAY_MS);
}

async function flush() {
  if (flushing || pending.length === 0) return;
  if (Date.now() - lastFailureAt < RETRY_AFTER_MS) return;

  flushing = true;
  const batch = pending.slice(0, BATCH_SIZE);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let done = false;

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client: clientInfo(), reports: batch }),
      signal: controller.signal,
    });
    // 400/413: sunucu govdeyi kabul etmiyor; tekrar denemek ayni cevabi getirir.
    // 404 (sunucu henuz yeni surume gecmediyse), 429 ve 5xx gecici: kuyrukta kalir.
    done = response.ok || response.status === 400 || response.status === 413;
    await response.text().catch(() => '');
  } catch {
    // Ag yok ya da zaman asimi: kuyrukta kalir.
  } finally {
    clearTimeout(timer);
    flushing = false;
  }

  if (!done) {
    lastFailureAt = Date.now();
    return;
  }

  lastFailureAt = 0;
  // Istek surerken yeni kayitlar eklenmis, sinir asildiysa eskiler dusmus
  // olabilir; siraya degil kimlige gore cikariyoruz.
  pending = pending.filter((report) => !batch.includes(report));
  if (persisted) {
    if (pending.length === 0) clearPersisted();
    else persistPending();
  }
  if (pending.length > 0) void flush();
}

/**
 * Bir hatayi kayda ekler. Asla firlatmaz: global hata yakalayicinin icinden de
 * cagriliyor ve orada firlatan bir kayit asil hatayi yutardi.
 */
export function logError(error: unknown, { source, fatal = false, context }: LogErrorOptions) {
  if (!ENABLED) return;

  try {
    if (reportsThisLaunch >= MAX_REPORTS_PER_LAUNCH) return;
    if (source === 'map' && mapReportsThisLaunch >= MAX_MAP_REPORTS_PER_LAUNCH) return;

    const details = describe(error);
    const key = `${source}|${details.message.replace(/\d+/g, '#')}`;
    const now = Date.now();
    const seenAt = lastSeenAt.get(key);
    if (seenAt !== undefined && now - seenAt < DEDUPE_WINDOW_MS) return;
    lastSeenAt.set(key, now);
    reportsThisLaunch += 1;
    if (source === 'map') mapReportsThisLaunch += 1;

    pending.push({
      source,
      fatal,
      ...details,
      route: currentRoute,
      userId: currentUserId,
      context: cleanContext(context),
      occurredAt: new Date(now).toISOString(),
    });
    if (pending.length > MAX_PENDING) pending = pending.slice(-MAX_PENDING);

    if (fatal) {
      persistPending();
      void flush();
    } else {
      scheduleFlush();
    }
  } catch {
    // Kayit tutulamadiysa sessizce vazgec.
  }
}

let installed = false;

/**
 * Global yakalayicilari kurar ve onceki acilistan kalan kayitlari gonderir.
 * Kok layout modulu yuklenirken bir kez cagriliyor.
 */
export function installErrorLog() {
  if (installed || !ENABLED) return;
  installed = true;

  // Olay isleyicileri, zamanlayicilar ve native'den gelen cagrilarda firlayan
  // hatalar buraya gelir. Ekran cizim hatalari GELMEZ: React Native onlari
  // dogrudan kendi rapor yoluna veriyor; onlari kok ErrorBoundary kaydediyor.
  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtils }).ErrorUtils;
  if (errorUtils) {
    const previous = errorUtils.getGlobalHandler();
    errorUtils.setGlobalHandler((error, isFatal) => {
      logError(error, { source: 'js', fatal: isFatal === true });
      previous(error, isFatal);
    });
  }

  // React Native yakalanmamis promise redlerini yalnizca gelistirmede izliyor
  // (LogBox uyarisi icin, bkz. react-native/Libraries/Core/polyfillPromise.js);
  // yayindaki surumde boyle bir hata tamamen sessiz kaliyordu.
  try {
    const hermes = (globalThis as { HermesInternal?: HermesInternal }).HermesInternal;
    hermes?.enablePromiseRejectionTracker?.({
      allRejections: true,
      onUnhandled: (_id, rejection) => logError(rejection, { source: 'promise' }),
      onHandled: () => {},
    });
  } catch {
    // Izleyici kurulamazsa diger kaynaklar yine calisir.
  }

  restorePersisted();
  if (pending.length > 0) scheduleFlush();

  // Cevrimdisiyken biriken kayitlar uygulama one gelince gitsin.
  AppState.addEventListener('change', (state) => {
    if (state === 'active' && pending.length > 0) void flush();
  });
}
