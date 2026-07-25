"use client";
import { POLLUTANT_COLORS, POLLUTANT_LABELS } from "@/lib/aqi";

const ALL_POLLUTANTS = ["pm25", "pm10", "no2", "so2", "co", "o3", "nh3", "pb"];

interface PollutantToggleProps {
  active: string[];
  onChange: (active: string[]) => void;
}

export default function PollutantToggle({ active, onChange }: PollutantToggleProps) {
  function toggle(p: string) {
    if (active.includes(p)) {
      onChange(active.filter((x) => x !== p));
    } else {
      onChange([...active, p]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {ALL_POLLUTANTS.map((p) => {
        const isActive = active.includes(p);
        const color = POLLUTANT_COLORS[p] ?? "#6b7280";
        return (
          <button
            key={p}
            onClick={() => toggle(p)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
            style={{
              border: `1px solid ${isActive ? color : "var(--border)"}`,
              color: isActive ? color : "var(--text-muted)",
              backgroundColor: isActive ? `${color}18` : "var(--bg-card)",
              opacity: isActive ? 1 : 0.6,
            }}
          >
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: color, opacity: isActive ? 1 : 0.4 }}
            />
            {POLLUTANT_LABELS[p]}
          </button>
        );
      })}
    </div>
  );
}
