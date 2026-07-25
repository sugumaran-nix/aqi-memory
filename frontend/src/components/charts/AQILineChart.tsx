"use client";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from "recharts";
import { format, parseISO, differenceInDays } from "date-fns";
import { POLLUTANT_COLORS, POLLUTANT_LABELS, FESTIVAL_DATES } from "@/lib/aqi";
import type { HistoryPoint } from "@/types";

interface Series {
  key: string;
  data: HistoryPoint[];
  label?: string;
  color?: string;
}

interface AQILineChartProps {
  series: Series[];
  activePollutants?: string[];
  showFestivals?: boolean;
  dateRange?: { start: string; end: string };
  height?: number;
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-4 py-3 text-sm border"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: "var(--border)",
        color: "var(--text-primary)",
        minWidth: 160,
      }}
    >
      <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{label}</div>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4 mb-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span style={{ color: "var(--text-muted)" }}>{entry.name}</span>
          </span>
          <span className="font-mono font-semibold">{entry.value?.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}

export default function AQILineChart({
  series,
  activePollutants,
  showFestivals = false,
  dateRange,
  height = 320,
}: AQILineChartProps) {
  // Merge all series data by timestamp
  const allTimestamps = Array.from(
    new Set(series.flatMap((s) => s.data.map((d) => d.timestamp)))
  ).sort();

  const chartData = allTimestamps.map((ts) => {
    const point: Record<string, unknown> = { timestamp: ts };
    for (const s of series) {
      const found = s.data.find((d) => d.timestamp === ts);
      point[s.key] = found?.value ?? null;
    }
    return point;
  });

  const isShortRange = allTimestamps.length <= 48;

  function formatXAxis(ts: string) {
    try {
      const d = new Date(ts.replace(" IST", ""));
      return isShortRange ? format(d, "HH:mm") : format(d, "dd MMM");
    } catch {
      return ts;
    }
  }

  // Festival reference lines in range
  const festivalLines = showFestivals && dateRange
    ? FESTIVAL_DATES.filter((f) => f.date >= dateRange.start && f.date <= dateRange.end)
    : [];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          vertical={false}
        />
        <XAxis
          dataKey="timestamp"
          tickFormatter={formatXAxis}
          tick={{ fontSize: 11, fill: "var(--text-muted)" }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[0, 500]}
          tick={{ fontSize: 11, fill: "var(--text-muted)" }}
          axisLine={false}
          tickLine={false}
          width={36}
        />

        {/* AQI zone reference lines */}
        {[50, 100, 200, 300, 400].map((v) => (
          <ReferenceLine
            key={v}
            y={v}
            stroke="var(--border)"
            strokeDasharray="2 4"
            strokeWidth={1}
          />
        ))}

        {/* Festival lines */}
        {festivalLines.map((f, i) => (
          <ReferenceLine
            key={`${f.name}-${i}`}
            x={f.date}
            stroke="var(--warning)"
            strokeDasharray="4 2"
            strokeWidth={1.5}
            label={{ value: f.name, fontSize: 10, fill: "var(--warning)", position: "top" }}
          />
        ))}

        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12, color: "var(--text-muted)", paddingTop: 8 }}
        />

        {series.map((s) => {
          const isHidden = activePollutants && !activePollutants.includes(s.key);
          return (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label ?? POLLUTANT_LABELS[s.key] ?? s.key}
              stroke={s.color ?? POLLUTANT_COLORS[s.key] ?? "#4ade80"}
              strokeWidth={isHidden ? 0 : 2}
              dot={false}
              connectNulls={false}
              hide={isHidden}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          );
        })}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
