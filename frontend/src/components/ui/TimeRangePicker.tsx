"use client";
import { useState } from "react";
import { subDays, subMonths, format } from "date-fns";

export interface TimeRange {
  start: string; // YYYY-MM-DD
  end: string;
}

interface Preset {
  label: string;
  key: string;
  range: () => TimeRange;
}

const PRESETS: Preset[] = [
  { label: "24h", key: "24h", range: () => ({ start: format(subDays(new Date(), 1), "yyyy-MM-dd"), end: format(new Date(), "yyyy-MM-dd") }) },
  { label: "7D",  key: "7d",  range: () => ({ start: format(subDays(new Date(), 7), "yyyy-MM-dd"), end: format(new Date(), "yyyy-MM-dd") }) },
  { label: "30D", key: "30d", range: () => ({ start: format(subDays(new Date(), 30), "yyyy-MM-dd"), end: format(new Date(), "yyyy-MM-dd") }) },
  { label: "3M",  key: "3m",  range: () => ({ start: format(subMonths(new Date(), 3), "yyyy-MM-dd"), end: format(new Date(), "yyyy-MM-dd") }) },
];

interface TimeRangePickerProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

export default function TimeRangePicker({ value, onChange }: TimeRangePickerProps) {
  const [activePreset, setActivePreset] = useState<string>("7d");
  const [showCustom, setShowCustom] = useState(false);
  const [customStart, setCustomStart] = useState(value.start);
  const [customEnd, setCustomEnd] = useState(value.end);

  function selectPreset(preset: Preset) {
    setActivePreset(preset.key);
    setShowCustom(false);
    onChange(preset.range());
  }

  function applyCustom() {
    if (customStart && customEnd && customStart <= customEnd) {
      onChange({ start: customStart, end: customEnd });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => (
        <button
          key={p.key}
          onClick={() => selectPreset(p)}
          className="px-3 py-1.5 rounded text-sm font-medium transition-colors"
          style={{
            border: `1px solid ${activePreset === p.key && !showCustom ? "var(--accent)" : "var(--border)"}`,
            color: activePreset === p.key && !showCustom ? "var(--accent)" : "var(--text-muted)",
            backgroundColor: "var(--bg-card)",
          }}
        >
          {p.label}
        </button>
      ))}
      <button
        onClick={() => { setShowCustom(!showCustom); setActivePreset("custom"); }}
        className="px-3 py-1.5 rounded text-sm font-medium transition-colors"
        style={{
          border: `1px solid ${showCustom ? "var(--accent)" : "var(--border)"}`,
          color: showCustom ? "var(--accent)" : "var(--text-muted)",
          backgroundColor: "var(--bg-card)",
        }}
      >
        Custom
      </button>

      {showCustom && (
        <div className="flex items-center gap-2 mt-1 w-full">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="px-2 py-1.5 rounded text-sm border bg-bg-card"
            style={{ borderColor: "var(--border)", color: "var(--text-primary)", backgroundColor: "var(--bg-card)" }}
          />
          <span style={{ color: "var(--text-muted)" }}>to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="px-2 py-1.5 rounded text-sm border bg-bg-card"
            style={{ borderColor: "var(--border)", color: "var(--text-primary)", backgroundColor: "var(--bg-card)" }}
          />
          <button
            onClick={applyCustom}
            className="px-3 py-1.5 rounded text-sm font-medium"
            style={{ backgroundColor: "var(--accent)", color: "#000" }}
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
