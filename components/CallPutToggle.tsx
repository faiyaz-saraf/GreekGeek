"use client";

interface CallPutToggleProps {
  selected: "call" | "put";
  onChange: (type: "call" | "put") => void;
}

export default function CallPutToggle({ selected, onChange }: CallPutToggleProps) {
  return (
    <div className="inline-flex rounded-lg overflow-hidden border border-gray-700">
      <button
        type="button"
        onClick={() => onChange("call")}
        className={`px-6 py-2 text-sm font-semibold transition-colors ${
          selected === "call"
            ? "bg-green-600 text-white"
            : "bg-gray-900 text-gray-400 hover:text-gray-200"
        }`}
      >
        Call
      </button>
      <button
        type="button"
        onClick={() => onChange("put")}
        className={`px-6 py-2 text-sm font-semibold transition-colors ${
          selected === "put"
            ? "bg-red-600 text-white"
            : "bg-gray-900 text-gray-400 hover:text-gray-200"
        }`}
      >
        Put
      </button>
    </div>
  );
}
