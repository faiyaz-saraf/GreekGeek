"use client";

import { useState, FormEvent } from "react";

interface SearchBarProps {
  onSearch: (ticker: string) => void;
  loading: boolean;
}

export default function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [value, setValue] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim().toUpperCase();
    if (trimmed.length > 0) {
      onSearch(trimmed);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          placeholder="Search a NASDAQ ticker… e.g. AAPL, NVDA, TSLA"
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-5 py-4 text-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          disabled={loading}
          autoFocus
        />
        <button
          type="submit"
          disabled={loading || value.trim().length === 0}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? (
            <svg
              className="animate-spin h-5 w-5"
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
          ) : (
            "Search"
          )}
        </button>
      </div>
    </form>
  );
}
