"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { Download, CheckCircle } from "lucide-react";
import { format, subDays } from "date-fns";
import {
  useCitySummary, useCityHistory, useEdits, buildExportUrl,
} from "@/lib/api";
import AQIBadge from "@/components/ui/AQIBadge";
import HealthAdvisory from "@/components/ui/HealthAdvisory";
import PollutantToggle from "@/components/ui/PollutantToggle";
import TimeRangePicker from "@/components/ui/TimeRangePicker";
import AQILineChart from "@/components/charts/AQILineChart";
import DiffCard from "@/components/ui/DiffCard";
import SkeletonCard from "@/components/ui/SkeletonCard";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { notify } from "@/lib/toast";

const ALL_POLLUTANTS = ["pm25", "pm10", "no2", "so2", "co", "o3", "nh3", "pb"];

export default function CityPage() {
  const params = useParams();
  const rawSlug = Array.isArray(params.slug) ? params.slug[0] : params.slug ?? "";
  const city = decodeURIComponent(rawSlug);

  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 7), "yyyy-MM-dd"),
    end:   format(new Date(), "yyyy-MM-dd"),
  });
  const [selectedStation, setSelectedStation] = useState<string | undefined>(undefined);
  const [activePollutants, setActivePollutants] = useState<string[]>(ALL_POLLUTANTS);

  const baseParams = {
    start_date: dateRange.start,
    end_date:   dateRange.end,
    station_id: selectedStation,
  };

  const { data: summary, isLoading: summaryLoading, error: summaryError } = useCitySummary(city);

  // ── FIXED: all 8 hooks called unconditionally at top level, never inside .map() ──
  const pm25H = useCityHistory(city, { ...baseParams, pollutant: "pm25" });
  const pm10H = useCityHistory(city, { ...baseParams, pollutant: "pm10" });
  const no2H  = useCityHistory(city, { ...baseParams, pollutant: "no2" });
  const so2H  = useCityHistory(city, { ...baseParams, pollutant: "so2" });
  const coH   = useCityHistory(city, { ...baseParams, pollutant: "co" });
  const o3H   = useCityHistory(city, { ...baseParams, pollutant: "o3" });
  const nh3H  = useCityHistory(city, { ...baseParams, pollutant: "nh3" });
  const pbH   = useCityHistory(city, { ...baseParams, pollutant: "pb" });

  const pollutantHistories = [
    { key: "pm25", data: pm25H.data ?? [] },
    { key: "pm10", data: pm10H.data ?? [] },
    { key: "no2",  data: no2H.data  ?? [] },
    { key: "so2",  data: so2H.data  ?? [] },
    { key: "co",   data: coH.data   ?? [] },
    { key: "o3",   data: o3H.data   ?? [] },
    { key: "nh3",  data: nh3H.data  ?? [] },
    { key: "pb",   data: pbH.data   ?? [] },
  ];

  const { data: edits } = useEdits({ city, per_page: 10 });

  if (summaryError) {
    return (
      <div role="alert" className="px-6 py-12 text-center" style={{ color: "var(--text-muted)" }}>
        <p className="text-lg font-medium mb-2" style={{ color: "var(--text-primary)" }}>
          City not found
        </p>
        <p className="text-sm">
          No monitoring stations for &ldquo;{city}&rdquo;.{" "}
          <a href="/cities" style={{ color: "var(--accent)" }}>Browse all cities →</a>
        </p>
      </div>
    );
  }

  const displayCity = summary?.city ?? city.charAt(0).toUpperCase() + city.slice(1);
  const exportUrl = buildExportUrl({ city, start_date: dateRange.start, end_date: dateRange.end, station_id: selectedStation });

  return (
    <div className="page-fade px-4 lg:px-8 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <section aria-label="City overview" className="mb-6">
        {summaryLoading ? (
          <SkeletonCard lines={2} className="max-w-sm" />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
                {displayCity}
              </h1>
              <AQIBadge aqi={summary?.current_aqi} size="lg" />
            </div>
            <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
              {summary?.state}
              {summary?.dominant_pollutant && (
                <span className="ml-3 px-2 py-0.5 rounded border text-xs" style={{ borderColor: "var(--border)" }}>
                  Dominant: {summary.dominant_pollutant}
                </span>
              )}
            </p>
            {summary && <HealthAdvisory aqi={summary.current_aqi} />}
          </>
        )}
      </section>

      {/* Station selector */}
      {(summary?.stations?.length ?? 0) > 1 && (
        <div className="mb-5">
          <label htmlFor="station-select" className="text-xs font-medium uppercase tracking-wide block mb-1.5" style={{ color: "var(--text-muted)" }}>
            Station
          </label>
          <select
            id="station-select"
            value={selectedStation ?? ""}
            onChange={(e) => setSelectedStation(e.target.value || undefined)}
            className="px-3 py-2 rounded-lg border text-sm max-w-xs w-full"
            style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }}
          >
            <option value="">All stations (average)</option>
            {summary?.stations.map((s) => (
              <option key={s.site_id} value={s.site_id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Chart */}
      <section aria-label="Air quality chart" className="rounded-xl border p-5 mb-6" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <TimeRangePicker value={dateRange} onChange={setDateRange} />
          <a
            href={exportUrl}
            download
            onClick={() => notify.success("Preparing CSV export…")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs border transition-colors no-underline hover:border-accent shrink-0"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)", backgroundColor: "var(--bg-card)" }}
            aria-label="Export data as CSV"
          >
            <Download size={13} aria-hidden="true" />
            Export CSV
          </a>
        </div>

        <ErrorBoundary>
          <div className="overflow-x-auto">
            <div style={{ minWidth: 480 }}>
              <AQILineChart
                series={pollutantHistories.filter((s) => activePollutants.includes(s.key))}
                activePollutants={activePollutants}
                dateRange={dateRange}
                height={320}
              />
            </div>
          </div>
        </ErrorBoundary>

        <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
          <PollutantToggle active={activePollutants} onChange={setActivePollutants} />
        </div>
      </section>

      {/* Data integrity */}
      <section aria-label="Data integrity" className="rounded-xl border p-5" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
        <h2 className="text-base font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Data edits detected
        </h2>
        {!edits?.items.length ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--accent)" }} role="status">
            <CheckCircle size={16} aria-hidden="true" />
            No edits detected for this city
          </div>
        ) : (
          <div className="space-y-3">
            {edits.items.map((edit) => (
              <DiffCard
                key={edit.id}
                original={edit.original_value}
                edited={edit.new_value}
                field={edit.field_changed}
                timestamp={edit.detected_at}
                stationName={edit.station_name}
                changePct={edit.change_pct}
                severity={edit.severity}
              />
            ))}
            {edits.total > 10 && (
              <p className="text-xs pt-1" style={{ color: "var(--text-muted)" }}>
                Showing 10 of {edits.total} edits.{" "}
                <a href={`/edits?city=${encodeURIComponent(city)}`} className="no-underline" style={{ color: "var(--accent)" }}>View all →</a>
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
