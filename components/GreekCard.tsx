"use client";

import Tooltip from "./Tooltip";

interface GreekCardProps {
  symbol: string;
  name: string;
  value: number | null;
  explanation: string;
  tooltip: string;
  animationClass: string;
}

export default function GreekCard({
  symbol,
  name,
  value,
  explanation,
  tooltip,
  animationClass,
}: GreekCardProps) {
  const formatted =
    value !== null ? (Math.abs(value) < 0.0001 ? "~0" : value.toFixed(4)) : "—";

  return (
    <div
      className={`greek-card bg-gray-900/80 border border-white/[0.06] rounded-2xl p-5 hover:border-indigo-500/50 opacity-0 ${animationClass}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="text-indigo-400 text-2xl font-mono font-bold mr-2 transition-colors group-hover:text-amber-400">
            {symbol}
          </span>
          <span className="text-gray-400 text-sm font-medium">{name}</span>
          <Tooltip text={tooltip} />
        </div>
      </div>
      <div className="text-white text-3xl font-bold mb-3 font-mono">
        {formatted}
      </div>
      <p className="text-gray-400 text-sm leading-relaxed">{explanation}</p>
    </div>
  );
}

export function buildExplanation(
  greek: string,
  value: number | null,
  ticker: string,
  type: "call" | "put",
  dte: number | null,
  iv: number | null
): string {
  if (value === null) return "Data unavailable for this contract.";

  const label = type === "call" ? "call" : "put";
  const absVal = Math.abs(value);

  switch (greek) {
    case "delta": {
      const dollarMove = (absVal * 100).toFixed(2);
      const direction = value >= 0 ? "gains" : "loses";
      return `For every $1 ${ticker} moves up, this ${label} ${direction} approximately $${dollarMove} in value.`;
    }
    case "gamma": {
      const sensitivity =
        absVal > 0.05
          ? "This option is very sensitive to price moves right now."
          : "Relatively stable directional exposure.";
      return `Delta will shift by ${absVal.toFixed(4)} for every $1 move. ${sensitivity}`;
    }
    case "theta": {
      const dteWarning =
        dte !== null && dte < 7
          ? " Time decay is aggressive this close to expiry!"
          : "";
      return `This option loses approximately $${absVal.toFixed(4)} per day from time passing.${dteWarning}`;
    }
    case "vega": {
      const ivNote =
        iv !== null && iv > 0.5
          ? " Volatility is elevated. Vega impact is high."
          : "";
      return `For every 1% change in implied volatility, this option gains or loses $${absVal.toFixed(4)}.${ivNote}`;
    }
    case "rho": {
      return `For every 1% rise in interest rates, this option's value changes by $${absVal.toFixed(4)}. Rho is usually the least impactful Greek for short-dated options.`;
    }
    default:
      return "";
  }
}