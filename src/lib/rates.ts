import seed from "@/data/rates-seed.json";

const UPSTREAM_URL = "https://open.er-api.com/v6/latest/USD";
const TTL_MS = 6 * 60 * 60 * 1000; // 6h, per spec

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

async function fetchLive(): Promise<RatesPayload> {
  const res = await fetch(UPSTREAM_URL, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`upstream responded ${res.status}`);
  const data = (await res.json()) as UpstreamResponse;
  if (data.result !== "success" || !data.rates?.USD) {
    throw new Error("unexpected upstream payload");
  }
  return {
    base: "USD",
    updated_at: toIso(data.time_last_update_utc),
    next_update_at: toIso(data.time_next_update_utc),
    source: "live",
    stale: false,
    rates: data.rates,
  };
}

export async function getRates(): Promise<RatesPayload> {
  const now = Date.now();
  if (cached && now - cachedAt < TTL_MS) {
    return cached;
  }
  try {
    const fresh = await fetchLive();
    cached = fresh;
    cachedAt = now;
    return fresh;
  } catch {
    if (cached) {
      return { ...cached, source: "stale", stale: true };
    }
    return fromSeed();
  }
}
