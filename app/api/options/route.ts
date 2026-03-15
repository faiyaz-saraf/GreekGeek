import { NextRequest, NextResponse } from "next/server";

// ─── Black-Scholes helpers ────────────────────────────────────────

const RISK_FREE_RATE = 0.045;

function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// Abramowitz & Stegun approximation (max error ~1.5e-7)
function normalCDF(x: number): number {
  if (x < -8) return 0;
  if (x > 8) return 1;

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const t2 = t * t;
  const t3 = t2 * t;
  const t4 = t3 * t;
  const t5 = t4 * t;
  const y =
    1.0 - (a1 * t + a2 * t2 + a3 * t3 + a4 * t4 + a5 * t5) * Math.exp(-absX * absX / 2);

  return 0.5 * (1.0 + sign * y);
}

interface Greeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

function calculateGreeks(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  type: "call" | "put"
): Greeks {
  // Guard: if time or volatility is zero/negative, return flat values
  if (T <= 0 || sigma <= 0) {
    const intrinsic =
      type === "call" ? Math.max(S - K, 0) : Math.max(K - S, 0);
    return {
      delta: intrinsic > 0 ? (type === "call" ? 1 : -1) : 0,
      gamma: 0,
      theta: 0,
      vega: 0,
      rho: 0,
    };
  }

  const sqrtT = Math.sqrt(T);
  const d1 =
    (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  const nd1 = normalCDF(d1);
  const nd2 = normalCDF(d2);
  const npd1 = normalPDF(d1);
  const expRT = Math.exp(-r * T);

  let delta: number;
  let theta: number;
  let rho: number;

  if (type === "call") {
    delta = nd1;
    theta =
      (-(S * npd1 * sigma) / (2 * sqrtT) - r * K * expRT * nd2) / 365;
    rho = (K * T * expRT * nd2) / 100;
  } else {
    delta = nd1 - 1;
    const nMinusD2 = normalCDF(-d2);
    theta =
      (-(S * npd1 * sigma) / (2 * sqrtT) + r * K * expRT * nMinusD2) / 365;
    rho = -(K * T * expRT * nMinusD2) / 100;
  }

  const gamma = npd1 / (S * sigma * sqrtT);
  const vega = (S * npd1 * sqrtT) / 100;

  return { delta, gamma, theta, vega, rho };
}

// ─── Yahoo Finance fetching with crumb auth ──────────────────────

const YAHOO_OPTIONS = "https://query2.finance.yahoo.com/v7/finance/options";
const YAHOO_CRUMB_URL = "https://query2.finance.yahoo.com/v1/test/getcrumb";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// Cache the crumb + cookie so we don't re-fetch on every request
let cachedCrumb: string | null = null;
let cachedCookie: string | null = null;
let crumbFetchedAt = 0;
const CRUMB_TTL = 1000 * 60 * 30; // refresh every 30 minutes

async function getYahooCrumb(): Promise<{ crumb: string; cookie: string }> {
  const now = Date.now();
  if (cachedCrumb && cachedCookie && now - crumbFetchedAt < CRUMB_TTL) {
    return { crumb: cachedCrumb, cookie: cachedCookie };
  }

  // Step 1: hit a Yahoo page to get a session cookie
  const cookieRes = await fetch("https://fc.yahoo.com/", {
    headers: { "User-Agent": UA },
    redirect: "manual",
  });
  // Extract set-cookie header (we need the A1/A3 cookies)
  const setCookies = cookieRes.headers.getSetCookie?.() ?? [];
  const cookieStr = setCookies
    .map((c) => c.split(";")[0])
    .join("; ");

  if (!cookieStr) {
    throw new Error("Failed to obtain Yahoo session cookie.");
  }

  // Step 2: fetch the crumb using that cookie
  const crumbRes = await fetch(YAHOO_CRUMB_URL, {
    headers: {
      "User-Agent": UA,
      Cookie: cookieStr,
    },
  });
  if (!crumbRes.ok) {
    throw new Error(`Failed to fetch Yahoo crumb: ${crumbRes.status}`);
  }
  const crumb = await crumbRes.text();

  if (!crumb || crumb.includes("{")) {
    throw new Error("Invalid crumb response from Yahoo.");
  }

  cachedCrumb = crumb.trim();
  cachedCookie = cookieStr;
  crumbFetchedAt = now;

  return { crumb: cachedCrumb, cookie: cachedCookie };
}

async function yahooFetch(url: string): Promise<Response> {
  const { crumb, cookie } = await getYahooCrumb();
  const separator = url.includes("?") ? "&" : "?";
  const fullUrl = `${url}${separator}crumb=${encodeURIComponent(crumb)}`;

  const res = await fetch(fullUrl, {
    headers: {
      "User-Agent": UA,
      Accept: "application/json",
      Cookie: cookie,
    },
  });

  // If crumb expired mid-session, clear cache and retry once
  if (res.status === 401) {
    cachedCrumb = null;
    cachedCookie = null;
    crumbFetchedAt = 0;

    const retry = await getYahooCrumb();
    const retryUrl = `${url}${separator}crumb=${encodeURIComponent(retry.crumb)}`;
    return fetch(retryUrl, {
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
        Cookie: retry.cookie,
      },
    });
  }

  return res;
}

interface YahooOption {
  strike: number;
  impliedVolatility: number;
  bid?: number;
  ask?: number;
  lastPrice?: number;
}

interface YahooResponse {
  optionChain?: {
    result?: Array<{
      quote?: {
        regularMarketPrice?: number;
      };
      expirationDates?: number[];
      options?: Array<{
        expirationDate?: number;
        calls?: YahooOption[];
        puts?: YahooOption[];
      }>;
    }>;
    error?: { description?: string };
  };
}

// ─── Route handler ────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const ticker = searchParams.get("ticker")?.toUpperCase();

  if (!ticker) {
    return NextResponse.json(
      { error: "Missing ticker parameter." },
      { status: 400 }
    );
  }

  try {
    if (action === "expirations") {
      return await fetchExpirations(ticker);
    }

    if (action === "chain") {
      const expiration = searchParams.get("expiration");
      if (!expiration) {
        return NextResponse.json(
          { error: "Missing expiration parameter." },
          { status: 400 }
        );
      }
      return await fetchChain(ticker, expiration);
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'expirations' or 'chain'." },
      { status: 400 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("API route error:", message);
    return NextResponse.json(
      { error: `Failed to fetch data: ${message}` },
      { status: 500 }
    );
  }
}

async function fetchExpirations(ticker: string) {
  const res = await yahooFetch(`${YAHOO_OPTIONS}/${ticker}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Yahoo Finance returned ${res.status}: ${body.slice(0, 200)}`);
  }

  const data: YahooResponse = await res.json();
  const result = data.optionChain?.result?.[0];

  if (!result || data.optionChain?.error) {
    return NextResponse.json(
      {
        error: `No options data found for "${ticker}". Verify the ticker symbol.`,
      },
      { status: 404 }
    );
  }

  const timestamps = result.expirationDates ?? [];
  if (timestamps.length === 0) {
    return NextResponse.json(
      { error: `No options expirations available for ${ticker}.` },
      { status: 404 }
    );
  }

  const expirations = timestamps.map((ts) => {
    const d = new Date(ts * 1000);
    return d.toISOString().split("T")[0];
  });

  return NextResponse.json({ ticker, expirations });
}

async function fetchChain(ticker: string, expiration: string) {
  const expiryTimestamp = Math.floor(
    new Date(expiration + "T00:00:00Z").getTime() / 1000
  );

  const res = await yahooFetch(
    `${YAHOO_OPTIONS}/${ticker}?date=${expiryTimestamp}`
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Yahoo Finance returned ${res.status}: ${body.slice(0, 200)}`);
  }

  const data: YahooResponse = await res.json();
  const result = data.optionChain?.result?.[0];

  if (!result) {
    return NextResponse.json(
      { error: `No chain data for ${ticker} at expiry ${expiration}.` },
      { status: 404 }
    );
  }

  const stockPrice = result.quote?.regularMarketPrice ?? 0;
  const optionsBlock = result.options?.[0];

  if (!optionsBlock || stockPrice <= 0) {
    return NextResponse.json(
      { error: `Incomplete data for ${ticker}. Stock price or chain missing.` },
      { status: 404 }
    );
  }

  const dte = Math.max(
    0,
    Math.ceil(
      (new Date(expiration + "T16:00:00Z").getTime() - Date.now()) /
        (1000 * 60 * 60 * 24)
    )
  );
  const T = Math.max(dte / 365, 1 / 365); // floor at 1 day to avoid div-by-zero

  interface GreeksPayload {
    delta: number | null;
    gamma: number | null;
    theta: number | null;
    vega: number | null;
    rho: number | null;
    iv: number | null;
  }

  interface StrikeData {
    strike: number;
    call: GreeksPayload | null;
    put: GreeksPayload | null;
  }

  const strikeMap = new Map<number, StrikeData>();

  function processOptions(
    options: YahooOption[],
    type: "call" | "put"
  ) {
    for (const opt of options) {
      const sigma = opt.impliedVolatility ?? 0;

      if (!strikeMap.has(opt.strike)) {
        strikeMap.set(opt.strike, {
          strike: opt.strike,
          call: null,
          put: null,
        });
      }

      const entry = strikeMap.get(opt.strike)!;

      if (sigma <= 0) {
        entry[type] = {
          delta: null,
          gamma: null,
          theta: null,
          vega: null,
          rho: null,
          iv: null,
        };
        continue;
      }

      const greeks = calculateGreeks(
        stockPrice,
        opt.strike,
        T,
        RISK_FREE_RATE,
        sigma,
        type
      );

      entry[type] = {
        delta: round(greeks.delta),
        gamma: round(greeks.gamma),
        theta: round(greeks.theta),
        vega: round(greeks.vega),
        rho: round(greeks.rho),
        iv: round(sigma),
      };
    }
  }

  processOptions(optionsBlock.calls ?? [], "call");
  processOptions(optionsBlock.puts ?? [], "put");

  const strikes = Array.from(strikeMap.values()).sort(
    (a, b) => a.strike - b.strike
  );

  return NextResponse.json({ ticker, expiration, dte, strikes });
}

function round(n: number): number {
  return Math.round(n * 1000000) / 1000000;
}