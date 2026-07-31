"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { Download, CheckCircle, MapPin, Activity } from "lucide-react";
import { format, subDays } from "date-fns";
import { useCitySummary, useCityHistory, useEdits, buildExportUrl } from "@/lib/api";
import AQIBadge from "@/components/ui/AQIBadge";
import HealthAdvisory from "@/components/ui/HealthAdvisory";
import PollutantToggle from "@/components/ui/PollutantToggle";
import TimeRangePicker from "@/components/ui/TimeRangePicker";
import AQILineChart from "@/components/charts/AQILineChart";
import DiffCard from "@/components/ui/DiffCard";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { notify } from "@/lib/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/shadcn/card";
import { Badge } from "@/components/ui/shadcn/badge";
import { Button } from "@/components/ui/shadcn/button";
import {
  ProgressBar, DonutChart, Legend as TremorLegend,
  Metric, Text, Flex, BadgeDelta,
} from "@tremor/react";
import { getAQIColor, getAQICategory, POLLUTANT_LABELS, POLLUTANT_COLORS } from "@/lib/aqi";

const ALL_POLLUTANTS = ["pm25", "pm10", "no2", "so2", "co", "o3", "nh3", "pb"];

const AQI_ZONES = [
  { label: "Good",        max: 50,  color: "#00B050" },
  { label: "Satisfactory",max: 100, color: "#92D050" },
  { label: "Moderate",    max: 200, color: "#FFFF00" },
  { label: "Poor",        max: 300, color: "#FF9900" },
  { label: "Very Poor",   max: 400, color: "#FF0000" },
  { label: "Severe",      max: 500, color: "#800000" },
];

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

  const baseParams = { start_date: dateRange.start, end_date: dateRange.end, station_id: selectedStation };

  const { data: summary, isLoading: summaryLoading, error: summaryError } = useCitySummary(city);

  const pm25H = useCityHistory(city, { ...baseParams, pollutant: "pm25" });
  const pm10H = useCityHistory(city, { ...baseParams, pollutant: "pm10" });
  const no2H  = useCityHistory(city, { ...baseParams, pollutant: "no2"  });
  const so2H  = useCityHistory(city, { ...baseParams, pollutant: "so2"  });
  const coH   = useCityHistory(city, { ...baseParams, pollutant: "co"   });
  const o3H   = useCityHistory(city, { ...baseParams, pollutant: "o3"   });
  const nh3H  = useCityHistory(city, { ...baseParams, pollutant: "nh3"  });
  const pbH   = useCityHistory(city, { ...baseParams, pollutant: "pb"   });

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
      <div role="alert" className="px-6 py-20 text-center">
        <p className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>City not found</p>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          No monitoring stations for &ldquo;{city}&rdquo;.
        </p>
        <Button asChild variant="outline">
          <a href="/cities" className="no-underline">Browse all cities →</a>
        </Button>
      </div>
    );
  }

  const displayCity = summary?.city ?? city.charAt(0).toUpperCase() + city.slice(1);
  const exportUrl   = buildExportUrl({ city, start_date: dateRange.start, end_date: dateRange.end, station_id: selectedStation });
  const aqi         = summary?.current_aqi;
  const aqiColor    = getAQIColor(aqi);
  const aqiCategory = getAQICategory(aqi);

  // AQI gauge: progress out of 500
  const aqiPct = aqi != null ? Math.min(Math.round((aqi / 500) * 100), 100) : 0;

  // Donut data: station AQI breakdown
  const stationDonutData = (summary?.stations ?? [])
    .filter(s => s.latest_aqi != null)
    .slice(0, 8)
    .map(s => ({ name: s.name.slice(0, 20), value: s.latest_aqi as number }));

  return (
    <div className="page-fade max-w-6xl mx-auto px-5 lg:px-8 py-8 pb-28 lg:pb-12">

      {/* ── Header ────────────────────────────────────────────── */}
      <section className="mb-8">
        {summaryLoading ? (
          <div className="space-y-3">
            <div className="skeleton h-10 w-48 rounded" />
            <div className="skeleton h-5 w-64 rounded" />
            <div className="skeleton h-14 w-full rounded-xl" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-4 mb-2">
              <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight"
                style={{ color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
                {displayCity}
              </h1>
              <AQIBadge aqi={aqi} size="lg" />
            </div>
            <div className="flex flex-wrap items-center gap-2 mb-4 text-sm" style={{ color: "var(--text-muted)" }}>
              <MapPin size={13} />
              <span>{summary?.state}</span>
              {summary?.dominant_pollutant && (
                <Badge variant="outline" className="text-xs">Dominant: {summary.dominant_pollutant}</Badge>
              )}
              {(summary?.stations?.length ?? 0) > 1 && (
                <Badge variant="outline" className="text-xs">{summary?.stations?.length} stations</Badge>
              )}
            </div>
            {summary && <HealthAdvisory aqi={aqi} />}
          </>
        )}
      </section>

      {/* ── KPI cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {/* AQI gauge */}
        <Card className="stat-card p-5">
          <Text className="text-xs font-semibold uppercase tracking-widest mb-1"
            style={{ color: "var(--text-muted)" }}>Current AQI</Text>
          <Flex alignItems="baseline" className="gap-2 mb-3">
            <Metric className="font-mono text-4xl font-bold"
              style={{ color: aqiColor }}>
              {aqi ?? "—"}
            </Metric>
            {aqiCategory && (
              <BadgeDelta
                deltaType={
                  aqi == null ? "unchanged" :
                  aqi <= 50  ? "decrease" :
                  aqi <= 200 ? "unchanged" : "increase"
                }
                className="text-xs"
              >
                {aqiCategory}
              </BadgeDelta>
            )}
          </Flex>
          <ProgressBar
            value={aqiPct}
            color={
              aqi == null ? "gray" :
              aqi <= 50   ? "green" :
              aqi <= 100  ? "lime" :
              aqi <= 200  ? "yellow" :
              aqi <= 300  ? "orange" :
              aqi <= 400  ? "red" : "rose"
            }
            className="h-2"
          />
          <div className="flex justify-between text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
            <span>0</span><span>Good–Severe</span><span>500</span>
          </div>
        </Card>

        {/* Stations online */}
        <Card className="stat-card p-5">
          <Text className="text-xs font-semibold uppercase tracking-widest mb-1"
            style={{ color: "var(--text-muted)" }}>Stations online</Text>
          <Metric className="font-mono text-4xl font-bold mb-1"
            style={{ color: "var(--text-primary)" }}>
            {summary?.stations?.filter(s => s.latest_aqi != null).length ?? "—"}
          </Metric>
          <Text style={{ color: "var(--text-muted)" }} className="text-sm">
            of {summary?.stations?.length ?? "—"} total in {displayCity}
          </Text>
          <Activity size={28} className="mt-3 opacity-20" style={{ color: "var(--accent)" }} />
        </Card>

        {/* Edits detected */}
        <Card className="stat-card p-5">
          <Text className="text-xs font-semibold uppercase tracking-widest mb-1"
            style={{ color: "var(--text-muted)" }}>Edits detected</Text>
          <Metric className="font-mono text-4xl font-bold mb-1"
            style={{ color: edits?.total ? "var(--danger)" : "var(--accent)" }}>
            {edits?.total ?? 0}
          </Metric>
          <Text style={{ color: "var(--text-muted)" }} className="text-sm">
            {edits?.total ? "data mutations logged" : "archive is clean"}
          </Text>
        </Card>
      </div>

      {/* ── Station AQI donut (only if >1 station) ─────────────── */}
      {stationDonutData.length > 1 && (
        <Card className="mb-8 p-5">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-sm">Station AQI breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex flex-col sm:flex-row items-center gap-6">
            <DonutChart
              data={stationDonutData}
              category="value"
              index="name"
              valueFormatter={(v) => `AQI ${v}`}
              className="h-40 w-40"
              showAnimation
            />
            <TremorLegend
              categories={stationDonutData.map(s => s.name)}
              className="text-xs max-w-xs flex-1"
            />
          </CardContent>
        </Card>
      )}

      {/* ── Station selector ────────────────────────────────────── */}
      {(summary?.stations?.length ?? 0) > 1 && (
        <div className="mb-5">
          <label htmlFor="station-select"
            className="text-xs font-semibold uppercase tracking-wider block mb-1.5"
            style={{ color: "var(--text-muted)" }}>
            Filter by station
          </label>
          <select
            id="station-select"
            value={selectedStation ?? ""}
            onChange={e => setSelectedStation(e.target.value || undefined)}
            className="px-3 py-2 rounded-lg border text-sm max-w-xs w-full outline-none"
            style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }}
          >
            <option value="">All stations (average)</option>
            {summary?.stations.map(s => (
              <option key={s.site_id} value={s.site_id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Chart ───────────────────────────────────────────────── */}
      <Card className="mb-8 p-5 relative overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <TimeRangePicker value={dateRange} onChange={setDateRange} />
          <Button asChild variant="outline" size="sm">
            <a href={exportUrl} download
              onClick={() => notify.success("Preparing CSV export…")}
              className="no-underline gap-1.5">
              <Download size={13} />
              Export CSV
            </a>
          </Button>
        </div>

        <ErrorBoundary>
          <div className="overflow-x-auto">
            <div style={{ minWidth: 480 }}>
              <AQILineChart
                series={pollutantHistories.filter(s => activePollutants.includes(s.key))}
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
      </Card>

      {/* ── AQI zone guide (Tremor ProgressBars) ─────────────────── */}
      <Card className="mb-8 p-5">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-sm">CPCB AQI scale reference</CardTitle>
        </CardHeader>
        <CardContent className="p-0 space-y-2">
          {AQI_ZONES.map(zone => (
            <div key={zone.label}>
              <div className="flex justify-between text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>
                <span>{zone.label}</span>
                <span>≤ {zone.max}</span>
              </div>
              <div className="h-1.5 rounded-full" style={{ backgroundColor: zone.color + "40" }}>
                <div className="h-full rounded-full" style={{
                  width: `${(zone.max / 500) * 100}%`,
                  backgroundColor: zone.color,
                }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Data edits ──────────────────────────────────────────── */}
      <Card className="p-5">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-sm flex items-center gap-2">
            Data edits detected
            {edits?.total != null && edits.total > 0 && (
              <Badge variant="destructive" className="text-xs">{edits.total}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!edits?.items.length ? (
            <div className="flex items-center gap-2 text-sm py-4" style={{ color: "var(--accent)" }}>
              <CheckCircle size={16} />
              No edits detected for this city — archive is clean
            </div>
          ) : (
            <div className="space-y-3">
              {edits.items.map(edit => (
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
                <p className="text-xs pt-2" style={{ color: "var(--text-muted)" }}>
                  Showing 10 of {edits.total} edits.{" "}
                  <a href={`/edits?city=${encodeURIComponent(city)}`}
                    className="no-underline" style={{ color: "var(--accent)" }}>View all →</a>
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
