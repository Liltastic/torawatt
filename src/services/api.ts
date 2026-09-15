import { getDeviceId } from '@/lib/deviceId';
import type {
  Campaign,
  ChargingHistoryDetail,
  Connector,
  ConnectorType,
  PaymentMethod,
  ReservationDetail,
  ReservationStatus,
  Station,
  Vehicle,
} from '@/types/domain';

import { API_BASE_URL } from './config';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Su anki oturum token'i. Store (src/store/auth.ts) her login/logout/hydrate'te
 * bunu gunceller. Modul seviyesinde tutuluyor ki bu dosya store'u import
 * etmesin (store zaten authApi'yi cagirmak icin bu dosyayi import ediyor -
 * cift yonlu import yerine store'un bu setter'i cagirmasi yeterli).
 */
let authToken: string | undefined;

export function setAuthToken(token: string | undefined) {
  authToken = token;
}

/** Store bunu kaydeder; token gecerliligini yitirince (90 gunluk sure dolar/sunucu reddeder) oturumu kapatir. */
let onUnauthorized: (() => void) | undefined;

export function setUnauthorizedHandler(handler: (() => void) | undefined) {
  onUnauthorized = handler;
}

/**
 * Android'de (OkHttp) okuma zaman asimi pratikte sinirsiz, yani kopmus bir
 * baglantida istek sonsuza kadar asili kalip ekranda donen bir spinner birakir;
 * o yuzden her istegin bir ust siniri var.
 *
 * Ama tek bir sabit sure yetmiyor: API Render'in ucretsiz katmaninda ve 15 dk
 * istek gelmeyince uyuyor; uyanmasi 30 sn'yi asabiliyor (emulatorde olculdu -
 * ilk kayit istegi 30 sn'de iptal edildi, hemen ardindan yapilan deneme aninda
 * gecti). 30 sn'lik sabit sinir bu uyanmayi "Sunucu yanit vermedi" hatasina
 * ceviriyordu; giris yapmak imkansizlasiyordu.
 *
 * Bu yuzden iki kademe: sunucudan yakin zamanda yanit almadiysak uyuyor
 * varsayip uzun sure taniyoruz, yanit geldikten sonra kisa sureye donuyoruz.
 * _layout.tsx acilista ve uygulama one gelince warmUpServer ile /health'e
 * dokunup uyanmayi kullanici daha formu doldururken baslatiyor.
 */
const WARM_TIMEOUT_MS = 30_000;
const COLD_TIMEOUT_MS = 90_000;
/** Render bu kadar sure istek almayinca servisi uyutuyor (15 dk); payli tutuyoruz. */
const ASSUME_ASLEEP_AFTER_MS = 10 * 60_000;

let lastResponseAt = 0;

function likelyAsleep() {
  return Date.now() - lastResponseAt > ASSUME_ASLEEP_AFTER_MS;
}

function noteServerResponded(status: number) {
  // 502-504 Render'in kendi katmanindan gelir: servis daha ayakta degil demek,
  // "uyandi" sayilmaz.
  if (status >= 502 && status <= 504) return;
  lastResponseAt = Date.now();
}

/**
 * Sunucuyu uyandirmak icin ates-et-unut /health istegi. Yaniti ve hatasi
 * onemsiz; tek amaci kullanici giris formunu doldururken uyanma suresini
 * onceden baslatmak. Sunucu zaten ayaktaysa istek atilmaz.
 */
export function warmUpServer() {
  if (!likelyAsleep()) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), COLD_TIMEOUT_MS);
  fetch(`${API_BASE_URL}/health`, { signal: controller.signal })
    .then((response) => noteServerResponded(response.status))
    .catch(() => {})
    .finally(() => clearTimeout(timer));
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean; includeDeviceId?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  // Iptali AbortSignal.timeout yerine kendi controller'imizla kuruyoruz: Expo'nun
  // fetch'i hatayi kendi FetchError'ina sardigi icin error.name 'AbortError'
  // olarak gelmiyor, zaman asimini ancak signal.aborted'dan ayirt edebiliyoruz.
  const controller = new AbortController();
  const timeoutMs = likelyAsleep() ? COLD_TIMEOUT_MS : WARM_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  let text: string;
  try {
    if (options.auth !== false && authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }
    // Sadece register/login: bu cihaz daha once auth'suz kullanildiysa,
    // sunucu eski verileri yeni hesaba tasiyabilsin diye (bkz. server/src/routes/auth.ts).
    if (options.includeDeviceId) {
      headers['x-device-id'] = await getDeviceId();
    }

    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body != null ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    noteServerResponded(response.status);

    if (response.status === 204) return undefined as T;

    // Govde okumasi da zaman asiminin ve bu catch'in icinde: Expo'nun fetch'i
    // basliklar gelir gelmez cozuluyor, govde yarida kesilirse hata buradan
    // gelir ve disarida kalsaydi ApiError'a sarilmadan yukari kacardi.
    text = await response.text();
  } catch (error) {
    if (controller.signal.aborted) {
      console.error(`API isteği zaman aşımına uğradı (${timeoutMs} ms): ${API_BASE_URL}${path}`);
      throw new ApiError('Sunucu yanıt vermedi. Uyanıyor olabilir; birkaç saniye sonra tekrar dene.', 0);
    }
    // Gercek sebep (network hatasi, SecureStore hatasi, CORS vb.) loglanmazsa
    // kullaniciya ve bize hep ayni jenerik mesaj gorunur, kok neden kaybolur.
    console.error(`API isteği başarısız: ${API_BASE_URL}${path}`, error);
    const detail = error instanceof Error ? ` (${error.message})` : '';
    throw new ApiError(`Sunucuya ulaşılamadı${detail}. Bağlantını kontrol et.`, 0);
  } finally {
    clearTimeout(timer);
  }

  let json: unknown;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    // Express her zaman JSON donduruyor; JSON olmayan govde ancak onundeki bir
    // katmandan (Render soguk baslangicta HTML 502) gelir. Govdeyi gormeden bunu
    // sunucunun kendi hatasindan ayirt etmek imkansiz oldugu icin bir parcasini logla.
    console.error(`API yanıtı JSON değil (${response.status}) ${path}:`, text.slice(0, 200));
    json = undefined;
  }

  const body = (json ?? {}) as { message?: unknown; error?: unknown };
  const serverMessage =
    typeof body.message === 'string'
      ? body.message
      : typeof body.error === 'string'
        ? body.error
        : undefined;

  if (!response.ok) {
    // auth !== false: gecerli bir token'la yapilmis, oturum gerektiren bir istek.
    // register/login/me kendi 401'ini kendisi ele aliyor (auth:false ya da hydrate'teki try/catch).
    if (response.status === 401 && options.auth !== false) {
      // Zaten token'siz gitmisse bu 401 yeni bir bilgi degil: cikistan sonra
      // mount kalmis bir kok rota (station/[id], favorites...) refetch ettiginde
      // olan tam olarak bu. onUnauthorized'i tekrar tetiklemek
      // logout -> cache temizligi -> refetch -> 401 dongusunu besliyor.
      const hadToken = authToken !== undefined;
      authToken = undefined;
      if (hadToken) onUnauthorized?.();
    }

    // Sunucudan mesaj gelmediyse: 5xx genelde gecici (soguk baslangic, yeniden
    // dagitim), kullaniciyi tekrar denemeye yonlendir.
    const fallback =
      response.status >= 500
        ? 'Sunucu şu anda yanıt vermiyor, birkaç saniye sonra tekrar dene.'
        : `İstek başarısız (${response.status})`;
    throw new ApiError(serverMessage ?? fallback, response.status);
  }

  if (text && json === undefined) {
    throw new ApiError('Sunucudan beklenmeyen bir yanıt geldi.', response.status);
  }

  return json as T;
}

// --- Kimlik dogrulama ---

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

export const authApi = {
  register: (email: string, password: string, name?: string) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: { email, password, name },
      auth: false,
      includeDeviceId: true,
    }),
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
      includeDeviceId: true,
    }),
  /** Su anki (module-level) token gecerliyse kullaniciyi dondurur. */
  me: () => request<AuthUser>('/auth/me'),
  updateProfile: (name: string) => request<AuthUser>('/auth/me', { method: 'PATCH', body: { name } }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ token?: string } | undefined>('/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    }),
  deleteAccount: () => request<void>('/auth/me', { method: 'DELETE' }),
};

// --- Istasyonlar (kimlik dogrulama gerekmez) ---

export const stationsApi = {
  list: () => request<Station[]>('/stations', { auth: false }),
  get: (id: string) => request<Station>(`/stations/${id}`, { auth: false }),
};

// --- Kampanyalar (kimlik dogrulama gerekmez) ---

export const campaignsApi = {
  list: () => request<Campaign[]>('/campaigns', { auth: false }),
};

// --- Araclar ---

export interface CreateVehicleInput {
  make: string;
  model: string;
  modelYear: number;
  batteryCapacityKwh: number;
  maxAcKw: number;
  maxDcKw: number;
  connectors: ConnectorType[];
  averageConsumptionKwhPer100Km: number;
}

export const vehiclesApi = {
  list: () => request<Vehicle[]>('/vehicles'),
  create: (input: CreateVehicleInput) =>
    request<Vehicle>('/vehicles', { method: 'POST', body: input }),
  activate: (id: string) => request<Vehicle>(`/vehicles/${id}/activate`, { method: 'POST' }),
  remove: (id: string) => request<void>(`/vehicles/${id}`, { method: 'DELETE' }),
};

// --- Rezervasyonlar ---

export interface CreateReservationInput {
  stationId: string;
  connectorId: string;
  startsAt: string;
  durationMinutes: number;
}

export const reservationsApi = {
  list: () => request<ReservationDetail[]>('/reservations'),
  create: (input: CreateReservationInput) =>
    request<ReservationDetail>('/reservations', { method: 'POST', body: input }),
  setStatus: (id: string, status: Extract<ReservationStatus, 'CONFIRMED' | 'ARRIVED' | 'CANCELLED'>) =>
    request<ReservationDetail>(`/reservations/${id}`, { method: 'PATCH', body: { status } }),
};

// --- Sarj gecmisi ---

export interface CreateHistoryInput {
  stationId?: string;
  stationName: string;
  connectorLabel: string;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  energyKwh: number;
  pricePerKwh: number;
  cost: number;
}

export const historyApi = {
  list: () => request<ChargingHistoryDetail[]>('/charging-history'),
  get: (id: string) => request<ChargingHistoryDetail>(`/charging-history/${id}`),
  create: (input: CreateHistoryInput) =>
    request<ChargingHistoryDetail>('/charging-history', { method: 'POST', body: input }),
};

// --- Favori istasyonlar ---

export const favoritesApi = {
  /** Favori istasyon id'leri; istasyon verisi zaten /stations'tan geliyor. */
  list: () => request<string[]>('/favorites'),
  add: (stationId: string) => request<void>(`/favorites/${stationId}`, { method: 'PUT' }),
  remove: (stationId: string) => request<void>(`/favorites/${stationId}`, { method: 'DELETE' }),
};

// --- Destek talepleri ---

export const supportApi = {
  send: (message: string) =>
    request<{ id: string; createdAt: string }>('/support', { method: 'POST', body: { message } }),
};

// --- Odeme yontemleri (demo) ---

export interface CreatePaymentMethodInput {
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
}

export const paymentMethodsApi = {
  list: () => request<PaymentMethod[]>('/payment-methods'),
  create: (input: CreatePaymentMethodInput) =>
    request<PaymentMethod>('/payment-methods', { method: 'POST', body: input }),
  setDefault: (id: string) =>
    request<PaymentMethod>(`/payment-methods/${id}/default`, { method: 'POST' }),
  remove: (id: string) => request<void>(`/payment-methods/${id}`, { method: 'DELETE' }),
};

export type { Connector };
