"use client";
import { formatTimestampIST } from "@/lib/aqi";
import { POLLUTANT_LABELS } from "@/lib/aqi";

interface DiffCardProps {
  original: number | null;
  edited: number | null;
  field: string;
  timestamp: string;
  stationName: string;
  changePct: number | null;
  severity: "minor" | "moderate" | "major";
}

const SEVERITY_COLORS = {
  minor:    "var(--warning)",
  moderate: "#fb923c",
  major:    "var(--danger)",
};

export default function DiffCard({
  original,
  edited,
  field,
  timestamp,
  stationName,
  changePct,
  severity,
}: DiffCardProps) {
  const label = POLLUTANT_LABELS[field] ?? field.toUpperCase();
  const borderColor = SEVERITY_COLORS[severity];

  const fmt = (v: number | null) => (v != null ? v.toFixed(1) : "—");

  return (
    <div
      className="rounded-lg overflow-hidden border"
      style={{ borderColor, borderLeftWidth: 3 }}
    >
      <div
        className="px-3 py-2 flex items-center justify-between text-xs"
        style={{ backgroundColor: "var(--bg-card)" }}
      >
        <span className="font-medium" style={{ color: "var(--text-primary)" }}>
          {stationName} — {label}
        </span>
        <span style={{ color: "var(--text-muted)" }}>{formatTimestampIST(timestamp)}</span>
      </div>

      <div className="grid grid-cols-2 divide-x" style={{ borderColor: "var(--border)" }}>
        <div className="px-4 py-3" style={{ background: "rgba(248,113,113,0.08)" }}>
          <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Was</div>
          <div className="font-mono text-lg font-semibold" style={{ color: "#f87171" }}>
            {fmt(original)}
          </div>
        </div>
        <div className="px-4 py-3" style={{ background: "rgba(74,222,128,0.08)" }}>
          <div className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Became</div>
          <div className="font-mono text-lg font-semibold" style={{ color: "#4ade80" }}>
            {edited != null ? fmt(edited) : "deleted"}
          </div>
        </div>
      </div>

      {changePct != null && (
        <div
          className="px-3 py-1.5 text-xs flex items-center gap-2"
          style={{ backgroundColor: "var(--bg-surface)" }}
        >
          <span
            className="px-1.5 py-0.5 rounded text-xs font-medium capitalize"
            style={{ color: borderColor, border: `1px solid ${borderColor}` }}
          >
            {severity}
          </span>
          <span style={{ color: "var(--text-muted)" }}>
            Δ {changePct.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}
