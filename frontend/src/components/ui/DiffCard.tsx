"use client";
import { formatTimestampIST } from "@/lib/aqi";
import { POLLUTANT_LABELS } from "@/lib/aqi";
import { ArrowRight, AlertTriangle, AlertOctagon, Info } from "lucide-react";

interface DiffCardProps {
  original: number | null;
  edited: number | null;
  field: string;
  timestamp: string;
  stationName: string;
  changePct: number | null;
  severity: "minor" | "moderate" | "major";
}

const SEVERITY_CONFIG = {
  minor:    { color: "#f59e0b", bg: "rgba(245,158,11,0.08)", icon: Info },
  moderate: { color: "#f97316", bg: "rgba(249,115,22,0.08)", icon: AlertTriangle },
  major:    { color: "#ef4444", bg: "rgba(239,68,68,0.08)",  icon: AlertOctagon },
};

export default function DiffCard({
  original, edited, field, timestamp, stationName, changePct, severity,
}: DiffCardProps) {
  const label = POLLUTANT_LABELS[field] ?? field.toUpperCase();
  const { color, bg, icon: Icon } = SEVERITY_CONFIG[severity];
  const fmt = (v: number | null) => (v != null ? v.toFixed(1) : "—");

  return (
    <div className="rounded-xl overflow-hidden border"
      style={{ borderColor: color + "40", backgroundColor: "var(--bg-card)" }}>
      {/* Header */}
      <div className="px-4 py-2.5 flex items-center justify-between"
        style={{ backgroundColor: bg, borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="flex items-center gap-2">
          <Icon size={13} style={{ color }} />
          <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
            {stationName}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded font-mono"
            style={{ color, backgroundColor: color + "15", border: `1px solid ${color}30` }}>
            {label}
          </span>
        </div>
        <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
          {formatTimestampIST(timestamp)}
        </span>
      </div>

      {/* Diff values */}
      <div className="flex items-center px-4 py-4 gap-4">
        <div className="flex-1 text-center p-3 rounded-lg" style={{ backgroundColor: "rgba(239,68,68,0.07)" }}>
          <div className="text-xs mb-1 font-medium" style={{ color: "var(--text-muted)" }}>Was</div>
          <div className="font-mono text-2xl font-bold" style={{ color: "#f87171" }}>{fmt(original)}</div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <ArrowRight size={16} style={{ color: "var(--text-muted)" }} />
          {changePct != null && (
            <span className="text-xs font-mono font-semibold" style={{ color }}>
              {changePct > 0 ? "+" : ""}{changePct.toFixed(1)}%
            </span>
          )}
        </div>
        <div className="flex-1 text-center p-3 rounded-lg" style={{ backgroundColor: "rgba(0,229,160,0.07)" }}>
          <div className="text-xs mb-1 font-medium" style={{ color: "var(--text-muted)" }}>Now</div>
          <div className="font-mono text-2xl font-bold" style={{ color: "var(--accent)" }}>
            {edited != null ? fmt(edited) : "deleted"}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t flex items-center gap-2"
        style={{ borderColor: "var(--border-subtle)", backgroundColor: "var(--bg-surface)" }}>
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize"
          style={{ color, backgroundColor: bg, border: `1px solid ${color}30` }}>
          <Icon size={10} />
          {severity}
        </span>
      </div>
    </div>
  );
}
