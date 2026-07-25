"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { format, subDays } from "date-fns";
import { useCities, useCityHistory } from "@/lib/api";
import TimeRangePicker from "@/components/ui/TimeRangePicker";
import AQIBadge from "@/components/ui/AQIBadge";
import {
  ResponsiveContainer, ComposedChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine,
} from "recharts";
import { format as dateFnsFormat } from "date-fns";
import { FESTIVAL_DATES } from "@/lib/aqi";
import { notify } from "@/lib/toast";

const CITY_COLORS = ["#4ade80", "#60a5fa", "#fb923c", "#f472b6"];
const MAX_CITIES = 4;

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-4 py-3 text-sm border shadow-xl"
      style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }}
    >
      <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{label}</div>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-3 mb-1 last:mb-0">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
          <span style={{ color: "var(--text-muted)" }}>{entry.name}</span>
          <span className="font-mono font-semibold ml-auto">{entry.value?.toFixed(0)}</span>
        </div>
      ))}
    </div>
  );
}

export default function ComparePage() {
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [cityInput, setCityInput] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showFestivals, setShowFestivals] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    end:   format(new Date(), "yyyy-MM-dd"),
  });

  const { data: allCities } = useCities();

  // ── FIXED: always exactly 4 hooks at top level, null keys = no fetch ──
  const histParams = { start_date: dateRange.start, end_date: dateRange.end, pollutant: "aqi" };
  const h0 = useCityHistory(selectedCities[0] ?? null, histParams);
  const h1 = useCityHistory(selectedCities[1] ?? null, histParams);
  const h2 = useCityHistory(selectedCities[2] ?? null, histParams);
  const h3 = useCityHistory(selectedCities[3] ?? null, histParams);

  const cityHistories = [h0, h1, h2, h3]
    .slice(0, selectedCities.length)
    .map((h, i) => ({ city: selectedCities[i], data: h.data ?? [] }));

  // Build chart data by merging all timestamps
  const allTs = Array.from(
    new Set(cityHistories.flatMap((c) => c.data.map((d) => d.timestamp)))
  ).sort();

  const chartData = allTs.map((ts) => {
    const point: Record<string, unknown> = { ts };
    for (const ch of cityHistories) {
      const found = ch.data.find((d) => d.timestamp === ts);
      point[ch.city] = found?.value ?? null;
    }
    return point;
  });

  const filtered =
    cityInput.trim().length >= 2
      ? (allCities ?? [])
          .filter(
            (c) =>
              c.city.toLowerCase().includes(cityInput.toLowerCase()) &&
              !selectedCities.includes(c.city)
          )
          .slice(0, 6)
      : [];

  function addCity(city: string) {
    if (selectedCities.length >= MAX_CITIES) {
      notify.error(`Maximum ${MAX_CITIES} cities can be compared at once.`);
      return;
    }
    setSelectedCities((prev) => [...prev, city]);
    setCityInput("");
    setShowDropdown(false);
  }

  function removeCity(city: string) {
    setSelectedCities((prev) => prev.filter((c) => c !== city));
  }

  const isShortRange = allTs.length <= 48;
  function formatXAxis(ts: string) {
    try {
      const d = new Date(ts.replace(" IST", "").replace(" ", "T") + "Z");
      return isShortRange ? dateFnsFormat(d, "HH:mm") : dateFnsFormat(d, "dd MMM");
    } catch { return ts; }
  }

  const festivalLines = showFestivals
    ? FESTIVAL_DATES.filter((f) => f.date >= dateRange.start && f.date <= dateRange.end)
    : [];

  function citySummary(city: string) {
    const h = cityHistories.find((c) => c.city === city);
    const vals = (h?.data ?? []).map((d) => d.value).filter((v): v is number => v != null);
    if (!vals.length) return null;
    return {
      worst: Math.max(...vals),
      best:  Math.min(...vals),
      avg:   Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
    };
  }

  return (
    <div className="page-fade px-4 lg:px-8 py-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
        Compare Cities
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
        Overlay up to {MAX_CITIES} cities on the same chart.
      </p>

      {/* City multi-select */}
      <div className="relative mb-6">
        <div
          className="flex flex-wrap gap-2 p-3 rounded-xl border min-h-[48px] items-center"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}
          role="group"
          aria-label="Selected cities"
        >
          {selectedCities.map((city, i) => (
            <span
              key={city}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
              style={{
                backgroundColor: `${CITY_COLORS[i]}20`,
                color: CITY_COLORS[i],
                border: `1px solid ${CITY_COLORS[i]}`,
              }}
            >
              {city}
              <button
                onClick={() => removeCity(city)}
                className="hover:opacity-70 rounded-full transition-opacity"
                aria-label={`Remove ${city}`}
              >
                <X size={12} aria-hidden="true" />
              </button>
            </span>
          ))}
          {selectedCities.length < MAX_CITIES && (
            <input
              type="text"
              placeholder={selectedCities.length === 0 ? "Add a city to compare…" : "Add another city…"}
              value={cityInput}
              onChange={(e) => { setCityInput(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={(e) => e.key === "Escape" && setShowDropdown(false)}
              aria-label="Search for a city to add"
              className="flex-1 min-w-[160px] outline-none bg-transparent text-sm"
              style={{ color: "var(--text-primary)" }}
            />
          )}
        </div>

        {showDropdown && filtered.length > 0 && (
          <ul
            role="listbox"
            aria-label="City suggestions"
            className="absolute top-full left-0 right-0 mt-1 rounded-xl border overflow-hidden z-50 shadow-xl"
            style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}
          >
            {filtered.map((c) => (
              <li key={c.city} role="option" aria-selected={false}>
                <button
                  onClick={() => addCity(c.city)}
                  className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-left hover:bg-white/5 transition-colors"
                  style={{ borderBottom: "1px solid var(--border)", color: "var(--text-primary)" }}
                >
                  <span>
                    {c.city}
                    <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>
                      {c.state}
                    </span>
                  </span>
                  <AQIBadge aqi={c.latest_aqi} size="sm" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <TimeRangePicker value={dateRange} onChange={setDateRange} />
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none" style={{ color: "var(--text-muted)" }}>
          <input
            type="checkbox"
            checked={showFestivals}
            onChange={(e) => setShowFestivals(e.target.checked)}
            className="accent-accent w-4 h-4"
          />
          Show festival dates
        </label>
      </div>

      {selectedCities.length === 0 ? (
        <div
          className="rounded-xl border p-12 text-center"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-muted)" }}
        >
          Add at least one city to start comparing
        </div>
      ) : (
        <>
          {/* Chart */}
          <section
            aria-label="Comparison chart"
            className="rounded-xl border p-5 mb-6"
            style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}
          >
            <div className="overflow-x-auto">
              <div style={{ minWidth: 480 }}>
                <ResponsiveContainer width="100%" height={360}>
                  <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="ts"
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
                    {[50, 100, 200, 300, 400].map((v) => (
                      <ReferenceLine key={v} y={v} stroke="var(--border)" strokeDasharray="2 4" strokeWidth={1} />
                    ))}
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
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, color: "var(--text-muted)", paddingTop: 8 }} />
                    {selectedCities.map((city, i) => (
                      <Line
                        key={city}
                        type="monotone"
                        dataKey={city}
                        name={city}
                        stroke={CITY_COLORS[i]}
                        strokeWidth={2}
                        dot={false}
                        connectNulls={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                      />
                    ))}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {selectedCities.map((city, i) => {
              const s = citySummary(city);
              const color = CITY_COLORS[i];
              const cityInfo = allCities?.find((c) => c.city === city);
              return (
                <article
                  key={city}
                  className="rounded-xl p-4 border"
                  style={{ backgroundColor: "var(--bg-card)", borderColor: color, borderLeftWidth: 3 }}
                  aria-label={`${city} summary`}
                >
                  <div className="font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                    {city}
                  </div>
                  {s ? (
                    <dl className="space-y-1.5 text-sm">
                      <div className="flex justify-between items-center">
                        <dt style={{ color: "var(--text-muted)" }}>Worst day</dt>
                        <dd><AQIBadge aqi={s.worst} size="sm" /></dd>
                      </div>
                      <div className="flex justify-between items-center">
                        <dt style={{ color: "var(--text-muted)" }}>Best day</dt>
                        <dd><AQIBadge aqi={s.best} size="sm" /></dd>
                      </div>
                      <div className="flex justify-between items-center">
                        <dt style={{ color: "var(--text-muted)" }}>Period avg</dt>
                        <dd className="font-mono font-semibold" style={{ color: "var(--text-primary)" }}>{s.avg}</dd>
                      </div>
                      {cityInfo?.dominant_pollutant && (
                        <div className="flex justify-between items-center">
                          <dt style={{ color: "var(--text-muted)" }}>Dominant</dt>
                          <dd className="text-xs" style={{ color: "var(--text-muted)" }}>{cityInfo.dominant_pollutant}</dd>
                        </div>
                      )}
                    </dl>
                  ) : (
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>No data in range</p>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
