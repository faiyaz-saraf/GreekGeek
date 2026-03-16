"use client";

import { useState, useEffect, useCallback } from "react";
import SearchBar from "@/components/SearchBar";
import ExpiryStrikeSelector from "@/components/ExpiryStrikeSelector";
import CallPutToggle from "@/components/CallPutToggle";
import GreekCard, { buildExplanation } from "@/components/GreekCard";

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

interface ChainEntry {
  expiration: string;
  strikes: { strike: number }[];
}

const TOOLTIPS: Record<string, string> = {
  delta: "How much the option moves when the stock moves $1.",
  gamma: "How fast Delta itself is changing.",
  theta: "How much value the option loses every day from time.",
  vega: "How sensitive the option is to changes in market volatility.",
  rho: "How sensitive the option is to changes in interest rates.",
};

const SYMBOLS: Record<string, string> = {
  delta: "Δ",
  gamma: "Γ",
  theta: "Θ",
  vega: "V",
  rho: "ρ",
};

const NAMES: Record<string, string> = {
  delta: "Delta",
  gamma: "Gamma",
  theta: "Theta",
  vega: "Vega",
  rho: "Rho",
};

export default function Home() {
  const [ticker, setTicker] = useState("");
  const [expirations, setExpirations] = useState<string[]>([]);
  const [selectedExpiry, setSelectedExpiry] = useState("");
  const [strikes, setStrikes] = useState<StrikeData[]>([]);
  const [selectedStrike, setSelectedStrike] = useState(0);
  const [contractType, setContractType] = useState<"call" | "put">("call");
  const [dte, setDte] = useState<number | null>(null);
  const [loadingExpirations, setLoadingExpirations] = useState(false);
  const [loadingChain, setLoadingChain] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  // Build the chain structure the ExpiryStrikeSelector expects
  const chain: ChainEntry[] = expirations.map((exp) => ({
    expiration: exp,
    strikes:
      exp === selectedExpiry
        ? strikes.map((s) => ({ strike: s.strike }))
        : [{ strike: 0 }],
  }));

  // Step 1: search ticker → fetch expirations
  async function handleSearch(searchTicker: string) {
    setLoadingExpirations(true);
    setError("");
    setExpirations([]);
    setStrikes([]);
    setDte(null);
    setSearched(true);
    setTicker(searchTicker);

    try {
      const res = await fetch(
        `/api/options?action=expirations&ticker=${encodeURIComponent(searchTicker)}`
      );
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Failed to fetch expirations.");
        setLoadingExpirations(false);
        return;
      }

      const dates: string[] = data.expirations || [];
      if (dates.length === 0) {
        setError(`No options found for ${searchTicker}.`);
        setLoadingExpirations(false);
        return;
      }

      setExpirations(dates);
      setSelectedExpiry(dates[0]);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoadingExpirations(false);
    }
  }

  // Step 2: when expiry changes → fetch chain with Greeks
  const fetchChain = useCallback(async () => {
    if (!ticker || !selectedExpiry) return;

    setLoadingChain(true);
    setError("");

    try {
      const res = await fetch(
        `/api/options?action=chain&ticker=${encodeURIComponent(ticker)}&expiration=${encodeURIComponent(selectedExpiry)}`
      );
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Failed to fetch options chain.");
        setStrikes([]);
        setLoadingChain(false);
        return;
      }

      const chainStrikes: StrikeData[] = data.strikes || [];
      setStrikes(chainStrikes);
      setDte(data.dte ?? null);

      // Default to middle strike (closest to ATM)
      if (chainStrikes.length > 0) {
        const mid =
          chainStrikes[Math.floor(chainStrikes.length / 2)]?.strike ??
          chainStrikes[0].strike;
        setSelectedStrike(mid);
      }
    } catch {
      setError("Failed to load options chain.");
      setStrikes([]);
    } finally {
      setLoadingChain(false);
    }
  }, [ticker, selectedExpiry]);

  useEffect(() => {
    if (ticker && selectedExpiry) {
      fetchChain();
    }
  }, [fetchChain, ticker, selectedExpiry]);

  // Get Greeks for the selected strike + call/put
  const currentStrike = strikes.find((s) => s.strike === selectedStrike);
  const greeks: GreeksPayload | null =
    currentStrike
      ? contractType === "call"
        ? currentStrike.call
        : currentStrike.put
      : null;

  function handleExpiryChange(expiry: string) {
    setSelectedExpiry(expiry);
  }

  const greekKeys = ["delta", "gamma", "theta", "vega", "rho"] as const;
  const loading = loadingExpirations || loadingChain;
  const hasData = expirations.length > 0 && strikes.length > 0 && !loading;

  return (
    <main className="min-h-screen pb-20">
      <header className="pt-10 pb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          GreekGeek
          <span className="text-indigo-400 ml-2 font-mono">Ω</span>
        </h1>
        <p className="text-gray-500 mt-2 text-sm">
          Options Greeks simplified for any NASDAQ stock
        </p>
      </header>

      <div className="max-w-3xl mx-auto px-4">
        <SearchBar onSearch={handleSearch} loading={loadingExpirations} />

        {error && (
          <div className="mt-4 bg-red-950/50 border border-red-800 rounded-xl px-4 py-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex justify-center mt-10">
            <svg
              className="animate-spin h-8 w-8 text-indigo-400"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          </div>
        )}

        {hasData && (
          <div className="mt-6 space-y-4 fade-up">
            <ExpiryStrikeSelector
              chain={chain}
              selectedExpiry={selectedExpiry}
              selectedStrike={selectedStrike}
              onExpiryChange={handleExpiryChange}
              onStrikeChange={setSelectedStrike}
            />

            <div className="flex justify-center">
              <CallPutToggle
                selected={contractType}
                onChange={setContractType}
              />
            </div>
          </div>
        )}

        {hasData && greeks && (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {greekKeys.map((key, i) => (
              <GreekCard
                key={key}
                symbol={SYMBOLS[key]}
                name={NAMES[key]}
                value={greeks[key]}
                tooltip={TOOLTIPS[key]}
                animationClass={`fade-up fade-up-${i + 1}`}
                explanation={buildExplanation(
                  key,
                  greeks[key],
                  ticker,
                  contractType,
                  dte,
                  greeks.iv
                )}
              />
            ))}
          </div>
        )}

        {hasData && !greeks && (
          <div className="mt-8 text-center text-gray-500 text-sm">
            No Greeks data available for this {contractType} at the ${selectedStrike} strike.
          </div>
        )}

        {!searched && (
          <div className="text-center mt-16 text-gray-600">
            <p className="text-5xl mb-4 font-mono">Ω</p>
            <p className="text-sm">
              Enter a ticker above to explore its options Greeks.
            </p>
          </div>
        )}
      </div>

      <footer className="mt-20 pb-8 text-center text-gray-500 text-xs">
        <p>
          Created by Faiyaz Saraf · © {new Date().getFullYear()} GreekGeek
        </p>
        <div className="mt-2 flex items-center justify-center gap-4">
          <a
            href="https://github.com/faiyaz-saraf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-white transition-colors"
          >
            GitHub
          </a>
          <a
            href="https://www.linkedin.com/in/faiyazsaraf/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-white transition-colors"
          >
            LinkedIn
          </a>
        </div>
      </footer>
    </main>
  );
}