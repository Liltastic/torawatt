import { getDeviceId } from '@/lib/deviceId';
import type {
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

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean; includeDeviceId?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  let response: Response;
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
    });
  } catch (error) {
    // Gercek sebep (network hatasi, SecureStore hatasi, CORS vb.) loglanmazsa
    // kullaniciya ve bize hep ayni jenerik mesaj gorunur, kok neden kaybolur.
    console.error(`API isteği başarısız: ${API_BASE_URL}${path}`, error);
    const detail = error instanceof Error ? ` (${error.message})` : '';
    throw new ApiError(`Sunucuya ulaşılamadı${detail}. Bağlantını kontrol et.`, 0);
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const json = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    // auth !== false: gecerli bir token'la yapilmis, oturum gerektiren bir istek.
    // register/login/me kendi 401'ini kendisi ele aliyor (auth:false ya da hydrate'teki try/catch).
    if (response.status === 401 && options.auth !== false) {
      authToken = undefined;
      onUnauthorized?.();
    }

    const message = json?.message ?? json?.error ?? `İstek başarısız (${response.status})`;
    throw new ApiError(message, response.status);
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
};

// --- Istasyonlar (kimlik dogrulama gerekmez) ---

export const stationsApi = {
  list: () => request<Station[]>('/stations', { auth: false }),
  get: (id: string) => request<Station>(`/stations/${id}`, { auth: false }),
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
