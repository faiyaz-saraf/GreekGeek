"use client";

import Tooltip from "./Tooltip";

interface Strike {
  strike: number;
}

interface ChainEntry {
  expiration: string;
  strikes: Strike[];
}

interface ExpiryStrikeSelectorProps {
  chain: ChainEntry[];
  selectedExpiry: string;
  selectedStrike: number;
  onExpiryChange: (expiry: string) => void;
  onStrikeChange: (strike: number) => void;
}

export default function ExpiryStrikeSelector({
  chain,
  selectedExpiry,
  selectedStrike,
  onExpiryChange,
  onStrikeChange,
}: ExpiryStrikeSelectorProps) {
  const currentExpiry = chain.find((c) => c.expiration === selectedExpiry);
  const strikes = currentExpiry?.strikes || [];

  return (
    <div className="flex gap-3 w-full">
      <div className="flex-1">
        <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider">
          Expiration
          <Tooltip text="The date the option contract expires. After this date, the option is worthless if not exercised." />
        </label>
        <select
          value={selectedExpiry}
          onChange={(e) => onExpiryChange(e.target.value)}
          className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/30 focus:shadow-[0_0_12px_rgba(245,158,11,0.15)] transition-all appearance-none cursor-pointer"
        >
          {chain.map((entry) => (
            <option key={entry.expiration} value={entry.expiration}>
              {formatDate(entry.expiration)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1">
        <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider">
          Strike Price
          <Tooltip text="The price at which you have the right to buy (call) or sell (put) the stock when the option is exercised." />
        </label>
        <select
          value={selectedStrike}
          onChange={(e) => onStrikeChange(Number(e.target.value))}
          className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/30 focus:shadow-[0_0_12px_rgba(245,158,11,0.15)] transition-all appearance-none cursor-pointer"
        >
          {strikes.map((s) => (
            <option key={s.strike} value={s.strike}>
              ${s.strike.toFixed(2)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}