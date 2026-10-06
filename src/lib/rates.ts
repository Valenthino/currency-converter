import seed from "@/data/rates-seed.json";

const UPSTREAM_URL = "https://open.er-api.com/v6/latest/USD";
const TTL_MS = 6 * 60 * 60 * 1000; // 6h, per spec
const RETRY_COOLDOWN_MS = 60 * 1000;
const REQUIRED_CODES = ["USD", "CAD", "XOF", "AED", "EUR"];

export type RatesPayload = {
  base: string;
  updated_at: string;
  next_update_at: string | null;
  source: "live" | "stale" | "seed";
  stale: boolean;
  rates: Record<string, number>;
};

type UpstreamResponse = {
  result: string;
  time_last_update_utc: string;
  time_next_update_utc: string;
  rates: Record<string, number>;
};

// ponytail: module-level singleton cache, per server instance — fine for a single-region personal app.
let cached: RatesPayload | null = null;
let cachedAt = 0;
let lastFailureAt = 0;
let inFlight: Promise<RatesPayload> | null = null;

function toIso(httpDate: string): string {
  const date = new Date(httpDate);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function fromSeed(): RatesPayload {
  return {
    base: seed.base,
    updated_at: toIso(seed.time_last_update_utc),
    next_update_at: null,
    source: "seed",
    stale: true,
    rates: seed.rates,
  };
}

function isValidPayload(data: UpstreamResponse): boolean {
  if (data.result !== "success" || !data.rates || typeof data.rates !== "object") return false;
  for (const code of REQUIRED_CODES) {
    if (!Object.hasOwn(data.rates, code)) return false;
  }
  for (const value of Object.values(data.rates)) {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return false;
  }
  if (Number.isNaN(new Date(data.time_last_update_utc).getTime())) return false;
  if (Number.isNaN(new Date(data.time_next_update_utc).getTime())) return false;
  return true;
}

async function fetchLive(): Promise<RatesPayload> {
  const res = await fetch(UPSTREAM_URL, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`upstream responded ${res.status}`);
  const data = (await res.json()) as UpstreamResponse;
  if (!isValidPayload(data)) throw new Error("invalid upstream payload");
  return {
    base: "USD",
    updated_at: toIso(data.time_last_update_utc),
    next_update_at: toIso(data.time_next_update_utc),
    source: "live",
    stale: false,
    rates: data.rates,
  };
}

function fallback(): RatesPayload {
  return cached ? { ...cached, source: "stale", stale: true } : fromSeed();
}

async function refresh(): Promise<RatesPayload> {
  try {
    const fresh = await fetchLive();
    cached = fresh;
    cachedAt = Date.now();
    lastFailureAt = 0;
    return fresh;
  } catch {
    lastFailureAt = Date.now();
    return fallback();
  }
}

export async function getRates(): Promise<RatesPayload> {
  const now = Date.now();
  if (cached && now - cachedAt < TTL_MS) return cached;
  if (now - lastFailureAt < RETRY_COOLDOWN_MS) return fallback();
  if (!inFlight) {
    inFlight = refresh().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}
