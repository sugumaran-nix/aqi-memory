import useSWR, { SWRConfiguration } from "swr";
import { notify } from "@/lib/toast";
import type {
  CityListItem, CitySummary, EditListResponse,
  EditStats, HistoryPoint, LiveStats, Reading,
} from "@/types";

// In the browser: use the Next.js rewrite proxy (/api/backend → Render).
// The browser only ever calls the Vercel domain → no CORS issues at all.
// In local dev / SSR: hit the backend directly via env var.
const API_URL =
  typeof window !== "undefined"
    ? "/api/backend"
    : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000");

const BASE_SWR: SWRConfiguration = {
  revalidateOnFocus: false,
  dedupingInterval: 60_000,
  shouldRetryOnError: true,
  errorRetryCount: 3,
  errorRetryInterval: 5_000,
  onError: (err: Error, key: string) => {
    if (typeof window !== "undefined") {
      const label = key.split("/").slice(-2).join("/");
      notify.error(`Failed to load ${label}. Check your connection.`);
    }
    console.error("[SWR]", key, err.message);
  },
};

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `HTTP ${res.status} — ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ── Hooks ────────────────────────────────────────────────────────────────────

export function useLiveStats() {
  return useSWR<LiveStats>(
    `${API_URL}/stats/live`,
    fetcher<LiveStats>,
    { ...BASE_SWR, refreshInterval: 5 * 60_000, onError: () => {} },
  );
}

export function useCities() {
  return useSWR<CityListItem[]>(
    `${API_URL}/cities`,
    fetcher<CityListItem[]>,
    { ...BASE_SWR, refreshInterval: 10 * 60_000 },
  );
}

export function useCitySummary(city: string | null) {
  return useSWR<CitySummary>(
    city ? `${API_URL}/cities/${encodeURIComponent(city)}/summary` : null,
    fetcher<CitySummary>,
    { ...BASE_SWR, refreshInterval: 5 * 60_000 },
  );
}

export interface HistoryParams {
  start_date?: string;
  end_date?: string;
  station_id?: string;
  pollutant?: string;
}

export function useCityHistory(city: string | null, params?: HistoryParams) {
  let url: string | null = null;
  if (city) {
    const q = new URLSearchParams();
    if (params?.start_date) q.set("start_date", params.start_date);
    if (params?.end_date)   q.set("end_date",   params.end_date);
    if (params?.station_id) q.set("station_id", params.station_id);
    if (params?.pollutant)  q.set("pollutant",  params.pollutant);
    url = `${API_URL}/cities/${encodeURIComponent(city)}/history?${q}`;
  }
  return useSWR<HistoryPoint[]>(url, fetcher<HistoryPoint[]>, {
    ...BASE_SWR,
    onError: () => {},
  });
}

export interface EditParams {
  city?: string;
  start_date?: string;
  end_date?: string;
  severity?: string;
  page?: number;
  per_page?: number;
}

export function useEdits(params?: EditParams) {
  const q = new URLSearchParams();
  if (params?.city)       q.set("city",       params.city);
  if (params?.start_date) q.set("start_date", params.start_date);
  if (params?.end_date)   q.set("end_date",   params.end_date);
  if (params?.severity)   q.set("severity",   params.severity);
  if (params?.page)       q.set("page",       String(params.page));
  if (params?.per_page)   q.set("per_page",   String(params.per_page));
  return useSWR<EditListResponse>(
    `${API_URL}/edits?${q}`,
    fetcher<EditListResponse>,
    BASE_SWR,
  );
}

export function useEditStats() {
  return useSWR<EditStats>(`${API_URL}/edits/stats`, fetcher<EditStats>, BASE_SWR);
}

export function useStationReadings(siteId: string | null, limit = 24) {
  return useSWR<Reading[]>(
    siteId ? `${API_URL}/stations/${siteId}/readings?limit=${limit}` : null,
    fetcher<Reading[]>,
    BASE_SWR,
  );
}

export function buildExportUrl(params: {
  city?: string;
  start_date?: string;
  end_date?: string;
  station_id?: string;
}): string {
  const q = new URLSearchParams();
  if (params.city)       q.set("city",       params.city);
  if (params.start_date) q.set("start_date", params.start_date);
  if (params.end_date)   q.set("end_date",   params.end_date);
  if (params.station_id) q.set("station_id", params.station_id);
  return `${API_URL}/readings/export?${q}`;
}
