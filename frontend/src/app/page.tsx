"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Wind } from "lucide-react";
import { useLiveStats, useCities, useEdits } from "@/lib/api";
import AQIBadge from "@/components/ui/AQIBadge";
import SkeletonCard from "@/components/ui/SkeletonCard";
import CitySparkline from "@/components/charts/CitySparkline";
import { formatTimestampIST } from "@/lib/aqi";

// Animated counter hook
function useCountUp(target: number, duration = 1500) {
  const [current, setCurrent] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    if (!target) return;
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.floor(eased * target));
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return current;
}

const SEVERITY_COLORS = { minor: "#facc15", moderate: "#fb923c", major: "#f87171" };

export default function HomePage() {
  const { data: stats, isLoading: statsLoading } = useLiveStats();
  const { data: cities, isLoading: citiesLoading } = useCities();
  const { data: edits, isLoading: editsLoading } = useEdits({ per_page: 5 });

  const countStations = useCountUp(stats?.total_stations ?? 0);
  const countReadings = useCountUp(stats?.total_readings ?? 0);
  const countEdits    = useCountUp(stats?.edits_caught_today ?? 0);

  const spotlightCities = (cities ?? []).slice(0, 6);

  return (
    <div className="page-fade px-6 py-8 max-w-6xl mx-auto pb-20 lg:pb-8">
      {/* Hero */}
      <section className="mb-12 pt-4">
        <div className="flex items-center gap-2 mb-3">
          <Wind size={18} style={{ color: "var(--accent)" }} />
          <span className="text-sm font-medium uppercase tracking-widest" style={{ color: "var(--accent)" }}>
            AQI Memory
          </span>
        </div>
        <h1
          className="text-4xl lg:text-5xl font-bold leading-tight mb-4"
          style={{ color: "var(--text-primary)" }}
        >
          India&apos;s air quality record.
          <br />
          <span style={{ color: "var(--accent)" }}>Unedited. Forever.</span>
        </h1>
        <p className="text-lg mb-8 max-w-xl" style={{ color: "var(--text-muted)" }}>
          Archiving readings from 560+ CPCB monitoring stations. Catching silent edits in real time.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/cities"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm no-underline transition-colors"
            style={{ backgroundColor: "var(--accent)", color: "#000" }}
          >
            Explore a city <ArrowRight size={15} />
          </Link>
          <Link
            href="/edits"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm no-underline transition-colors border"
            style={{ borderColor: "var(--border)", color: "var(--text-primary)", backgroundColor: "var(--bg-card)" }}
          >
            See caught edits <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {/* Live stat bar */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
        {[
          { label: "Stations monitored", value: statsLoading ? null : countStations },
          { label: "Readings archived",  value: statsLoading ? null : countReadings },
          { label: "Edits caught today", value: statsLoading ? null : countEdits },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl p-6 border"
            style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}
          >
            <div
              className="text-3xl font-mono font-bold mb-1"
              style={{ color: "var(--text-primary)" }}
            >
              {value != null ? value.toLocaleString() : (
                <div className="skeleton h-8 w-24 rounded" />
              )}
            </div>
            <div className="text-sm" style={{ color: "var(--text-muted)" }}>{label}</div>
          </div>
        ))}
      </section>

      {/* Latest edits table */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            Latest edits caught
          </h2>
          <Link href="/edits" className="text-sm no-underline" style={{ color: "var(--accent)" }}>
            View all edits →
          </Link>
        </div>

        <div
          className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}
        >
          {editsLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton h-4 rounded w-full" />
              ))}
            </div>
          ) : !edits?.items.length ? (
            <div className="py-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>
              No edits detected yet — the archive is clean.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid var(--border)",
                      backgroundColor: "var(--bg-surface)",
                    }}
                  >
                    {["Time", "City", "Station", "Was", "Now", "Δ%", "Severity"].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wide"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {edits.items.map((edit) => {
                    const sev = edit.severity as keyof typeof SEVERITY_COLORS;
                    return (
                      <tr
                        key={edit.id}
                        style={{
                          borderLeft: `3px solid ${SEVERITY_COLORS[sev]}`,
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                          {formatTimestampIST(edit.detected_at)}
                        </td>
                        <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}>
                          {edit.city}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
                          {edit.station_name}
                        </td>
                        <td className="px-4 py-3 font-mono" style={{ color: "#f87171" }}>
                          {edit.original_value?.toFixed(1) ?? "—"}
                        </td>
                        <td className="px-4 py-3 font-mono" style={{ color: "#4ade80" }}>
                          {edit.new_value?.toFixed(1) ?? "deleted"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                          {edit.change_pct?.toFixed(1) ?? "—"}%
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="px-2 py-0.5 rounded text-xs font-medium capitalize"
                            style={{
                              color: SEVERITY_COLORS[sev],
                              border: `1px solid ${SEVERITY_COLORS[sev]}`,
                            }}
                          >
                            {edit.severity}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* City spotlight */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            City spotlight
          </h2>
          <Link href="/cities" className="text-sm no-underline" style={{ color: "var(--accent)" }}>
            All cities →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {citiesLoading
            ? [...Array(6)].map((_, i) => <SkeletonCard key={i} lines={4} />)
            : spotlightCities.map((city) => (
                <Link
                  key={city.city}
                  href={`/city/${encodeURIComponent(city.city.toLowerCase())}`}
                  className="no-underline group"
                >
                  <div
                    className="rounded-xl p-5 border transition-colors group-hover:border-accent"
                    style={{
                      backgroundColor: "var(--bg-card)",
                      borderColor: "var(--border)",
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-semibold" style={{ color: "var(--text-primary)" }}>
                          {city.city}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                          {city.state}
                        </div>
                      </div>
                      <AQIBadge aqi={city.latest_aqi} size="md" />
                    </div>

                    {city.dominant_pollutant && (
                      <div
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs mb-3 border"
                        style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                      >
                        {city.dominant_pollutant}
                      </div>
                    )}

                    <CitySparkline city={city.city} width={200} height={36} />

                    {city.updated_at && (
                      <div className="text-[11px] mt-2" style={{ color: "var(--text-muted)" }}>
                        Updated {city.updated_at}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
        </div>
      </section>
    </div>
  );
}
