/**
 * Go sunucusuyla konusan tek katman.
 *
 * Oturum bileti HttpOnly cerezde duruyor (bkz. backend/internal/api), bu
 * yuzden burada token tasinmiyor - yalnizca `credentials: 'include'` gerekiyor.
 * 401 gelen her istek oturumun bittigi anlamina gelir; cagiran taraf bunu
 * yakalayip giris ekranina donuyor (bkz. SessionProvider).
 */

export interface Point {
  label: string;
  value: number;
}

export interface Metric {
  value: number;
  delta: number;
  series: Point[];
}

export interface Counts {
  users: number;
  stations: number;
  connectors: number;
  vehicles: number;
  reservations: number;
  campaigns: number;
  support: number;
}

export interface StationLoad {
  stationId: string;
  name: string;
  sessions: number;
  energyKwh: number;
  available: number;
  total: number;
}

export interface Reservation {
  id: string;
  ownerId: string;
  ownerEmail: string;
  stationName: string;
  connectorLabel: string;
  startsAt: string;
  durationMinutes: number;
  status: string;
}

export interface Overview {
  energy: Metric;
  sessions: Metric;
  revenue: Metric;
  utilisation: Metric;
  activity: Point[];
  upcoming: Reservation[];
  topStations: StationLoad[];
  counts: Counts;
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  vehicles: number;
  sessions: number;
  energyKwh: number;
}

export interface Connector {
  id: string;
  stationId: string;
  type: string;
  powerKw: number;
  status: string;
  pricePerKwh: number | null;
  idleFeePerMin: number | null;
}

export interface Station {
  id: string;
  name: string;
  address: string;
  operator: string;
  latitude: number;
  longitude: number;
  amenities: string[] | null;
  connectors: Connector[];
}

export interface Vehicle {
  id: string;
  ownerId: string;
  ownerEmail: string;
  make: string;
  model: string;
  modelYear: number;
  batteryCapacityKwh: number;
  isActive: boolean;
}

export interface Session {
  id: string;
  ownerEmail: string;
  stationName: string;
  connectorLabel: string;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  energyKwh: number;
  pricePerKwh: number;
  cost: number;
}

export interface Campaign {
  id: string;
  title: string;
  description: string;
  discountLabel: string;
  validUntil: string | null;
  isActive: boolean;
}

export interface SupportRequest {
  id: string;
  ownerEmail: string;
  message: string;
  createdAt: string;
}

export interface Page<T> {
  items: T[];
  total: number;
}

export interface SessionInfo {
  email: string;
  demo: boolean;
}

/** Oturumu biten istegi cagiranin ayirt edebilmesi icin ayri tip. */
export class UnauthorisedError extends Error {
  constructor() {
    super('Oturum gerekli');
    this.name = 'UnauthorisedError';
  }
}

export class ApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });

  if (response.status === 401) throw new UnauthorisedError();

  if (!response.ok) {
    // Sunucu hata mesajini JSON govdesinde veriyor; okunamiyorsa duruma
    // gore genel bir mesaj kaliyor.
    const fallback = `Istek basarisiz (${response.status})`;
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(body?.error ?? fallback);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

const query = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
};

export interface ListParams {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
  /** Siralanacak sutunun mantiksal adi; sunucu beyaz listeden geciriyor. */
  sort?: string;
  dir?: 'asc' | 'desc';
}

export interface UserDetail {
  user: User;
  vehicles: Vehicle[];
  reservations: Reservation[];
  sessions: Session[];
  totalSpent: number;
}

export interface StationDetail {
  station: Station;
  sessions: Session[];
  energyKwh: number;
  revenue: number;
}

export interface Slice {
  label: string;
  sessions: number;
  energyKwh: number;
  revenue: number;
}

export interface Analytics {
  days: number;
  byStation: Slice[];
  byConnector: Slice[];
  byHour: Slice[];
  daily: Point[];
  revenue: Point[];
  avgEnergyKwh: number;
  avgRevenue: number;
  avgDurationMin: number;
}

export const api = {
  login: (email: string, password: string) =>
    request<SessionInfo>('/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request<{ ok: boolean }>('/logout', { method: 'POST' }),
  session: () => request<SessionInfo>('/session'),

  overview: (days: number) => request<Overview>(`/overview${query({ days })}`),

  users: (p: ListParams = {}) => request<Page<User>>(`/users${query({ ...p })}`),
  userDetail: (id: string) => request<UserDetail>(`/users/${id}`),
  deleteUser: (id: string) => request<{ ok: boolean }>(`/users/${id}`, { method: 'DELETE' }),

  stations: (p: ListParams = {}) => request<Page<Station>>(`/stations${query({ ...p })}`),
  saveStation: (station: Partial<Station>) =>
    request<Station>('/stations', { method: 'POST', body: JSON.stringify(station) }),
  deleteStation: (id: string) => request<{ ok: boolean }>(`/stations/${id}`, { method: 'DELETE' }),
  stationDetail: (id: string) => request<StationDetail>(`/stations/${id}/detail`),
  saveConnector: (connector: Partial<Connector>) =>
    request<Connector>('/connectors', { method: 'POST', body: JSON.stringify(connector) }),
  deleteConnector: (id: string) =>
    request<{ ok: boolean }>(`/connectors/${id}`, { method: 'DELETE' }),
  setConnectorStatus: (id: string, status: string) =>
    request<{ ok: boolean }>(`/connectors/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),

  vehicles: (p: ListParams = {}) => request<Page<Vehicle>>(`/vehicles${query({ ...p })}`),

  reservations: (p: ListParams = {}) => request<Page<Reservation>>(`/reservations${query({ ...p })}`),
  setReservationStatus: (id: string, status: string) =>
    request<{ ok: boolean }>(`/reservations/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),

  sessions: (p: ListParams = {}) => request<Page<Session>>(`/sessions${query({ ...p })}`),

  campaigns: (p: ListParams = {}) => request<Page<Campaign>>(`/campaigns${query({ ...p })}`),
  saveCampaign: (campaign: Partial<Campaign>) =>
    request<Campaign>('/campaigns', { method: 'POST', body: JSON.stringify(campaign) }),
  deleteCampaign: (id: string) => request<{ ok: boolean }>(`/campaigns/${id}`, { method: 'DELETE' }),

  support: (p: ListParams = {}) => request<Page<SupportRequest>>(`/support${query({ ...p })}`),

  analytics: (days: number) => request<Analytics>(`/analytics${query({ days })}`),

  /**
   * Disa aktarim tarayicinin kendi indirme akisiyla yapiliyor: dosyayi
   * bellege almak yerine adresi aciyoruz, boylece buyuk dosya da sorunsuz
   * iniyor ve sunucunun verdigi dosya adi korunuyor.
   */
  exportUrl: (kind: string, p: ListParams = {}) => `/api/export/${kind}${query({ ...p })}`,
};
