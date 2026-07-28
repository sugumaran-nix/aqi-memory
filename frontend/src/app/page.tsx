"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Wind, Shield, TrendingUp, Clock, ChevronRight } from "lucide-react";
import { useLiveStats, useCities, useEdits } from "@/lib/api";
import AQIBadge from "@/components/ui/AQIBadge";
import SkeletonCard from "@/components/ui/SkeletonCard";
import CitySparkline from "@/components/charts/CitySparkline";
import { formatTimestampIST } from "@/lib/aqi";

function useCountUp(target: number, duration = 1800) {
  const [current, setCurrent] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    if (!target) return;
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setCurrent(Math.floor(eased * target));
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return current;
}

const SEVERITY_COLORS = { minor: "#f59e0b", moderate: "#f97316", major: "#ef4444" };
const SEVERITY_BG     = { minor: "rgba(245,158,11,0.08)", moderate: "rgba(249,115,22,0.08)", major: "rgba(239,68,68,0.08)" };

export default function HomePage() {
  const { data: stats, isLoading: statsLoading } = useLiveStats();
  const { data: cities, isLoading: citiesLoading } = useCities();
  const { data: edits, isLoading: editsLoading } = useEdits({ per_page: 5 });

  const countStations = useCountUp(stats?.total_stations ?? 0);
  const countReadings = useCountUp(stats?.total_readings ?? 0);
  const countEdits    = useCountUp(stats?.edits_caught_today ?? 0);

  const spotlightCities = (cities ?? []).slice(0, 6);

  return (
    <div className="page-fade px-5 lg:px-8 py-8 max-w-6xl mx-auto pb-24 lg:pb-10">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="mb-14 pt-2">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5 text-xs font-semibold tracking-wider uppercase"
          style={{
            color: "var(--accent)",
            backgroundColor: "var(--color-primary-glow)",
            border: "1px solid rgba(0,229,160,0.2)",
          }}>
          <Wind size={11} />
          AQI Memory · India's Air Archive
        </div>

        <h1 className="text-4xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight mb-5"
          style={{ color: "var(--text-primary)", letterSpacing: "-0.03em" }}>
          India&apos;s air quality.
          <br />
          <span className="gradient-text">Unedited. Forever.</span>
        </h1>

        <p className="text-lg leading-relaxed mb-8 max-w-lg"
          style={{ color: "var(--text-secondary)", lineHeight: "1.65" }}>
          Archiving readings from <strong style={{ color: "var(--text-primary)" }}>560+ CPCB monitoring stations</strong> every hour.
          Catching silent data edits in real time before they disappear.
        </p>

        <div className="flex flex-wrap gap-3">
          <Link href="/cities"
            className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm no-underline">
            Explore cities <ArrowRight size={14} />
          </Link>
          <Link href="/edits"
            className="btn-ghost inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm no-underline">
            See caught edits <ChevronRight size={14} />
          </Link>
        </div>
      </section>

      {/* ── Stats Bar ────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-14">
        {[
          { label: "Stations monitored", value: statsLoading ? null : countStations, icon: Shield, desc: "Active CPCB stations" },
          { label: "Readings archived",  value: statsLoading ? null : countReadings, icon: Clock,  desc: "Total data points saved" },
          { label: "Edits caught today", value: statsLoading ? null : countEdits,    icon: TrendingUp, desc: "Silent mutations flagged" },
        ].map(({ label, value, icon: Icon, desc }) => (
          <div key={label}
            className="stat-card rounded-xl p-6 border card-hover"
            style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: "var(--color-primary-glow)", border: "1px solid rgba(0,229,160,0.2)" }}>
                <Icon size={15} style={{ color: "var(--accent)" }} />
              </div>
            </div>
            <div className="font-mono text-3xl font-bold mb-0.5 tracking-tight"
              style={{ color: "var(--text-primary)" }}>
              {value != null ? value.toLocaleString() : (
                <div className="skeleton h-8 w-24 rounded" />
              )}
            </div>
            <div className="text-sm font-medium mb-0.5" style={{ color: "var(--text-secondary)" }}>{label}</div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>{desc}</div>
          </div>
        ))}
      </section>

      {/* ── Latest Edits ─────────────────────────────────────────── */}
      <section className="mb-14">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Latest edits caught</h2>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>Real-time mutation detection across all stations</p>
          </div>
          <Link href="/edits"
            className="inline-flex items-center gap-1 text-sm no-underline font-medium"
            style={{ color: "var(--accent)" }}>
            View all <ArrowRight size={13} />
          </Link>
        </div>

        <div className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
          {editsLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton h-4 rounded w-full" />
              ))}
            </div>
          ) : !edits?.items.length ? (
            <div className="py-14 text-center">
              <Shield size={28} className="mx-auto mb-3" style={{ color: "var(--accent)" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No edits detected yet — the archive is clean.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-surface)" }}>
                    {["Time", "City", "Station", "Was", "Now", "Δ%", "Severity"].map((h) => (
                      <th key={h}
                        className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest"
                        style={{ color: "var(--text-muted)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {edits.items.map((edit) => {
                    const sev = edit.severity as keyof typeof SEVERITY_COLORS;
                    return (
                      <tr key={edit.id} className="table-row-hover"
                        style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                          {formatTimestampIST(edit.detected_at)}
                        </td>
                        <td className="px-4 py-3 font-medium" style={{ color: "var(--text-primary)" }}>{edit.city}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>{edit.station_name}</td>
                        <td className="px-4 py-3 font-mono font-semibold" style={{ color: "#f87171" }}>
                          {edit.original_value?.toFixed(1) ?? "—"}
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold" style={{ color: "var(--accent)" }}>
                          {edit.new_value?.toFixed(1) ?? "deleted"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                          {edit.change_pct?.toFixed(1) ?? "—"}%
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold capitalize"
                            style={{
                              color: SEVERITY_COLORS[sev],
                              backgroundColor: SEVERITY_BG[sev],
                              border: `1px solid ${SEVERITY_COLORS[sev]}30`,
                            }}>
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

      {/* ── City Spotlight ───────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>City spotlight</h2>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>Latest readings from major cities</p>
          </div>
          <Link href="/cities"
            className="inline-flex items-center gap-1 text-sm no-underline font-medium"
            style={{ color: "var(--accent)" }}>
            All cities <ArrowRight size={13} />
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
                <div className="rounded-xl p-5 border card-hover h-full"
                  style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-semibold" style={{ color: "var(--text-primary)" }}>{city.city}</div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{city.state}</div>
                    </div>
                    <AQIBadge aqi={city.latest_aqi} size="md" />
                  </div>

                  {city.dominant_pollutant && (
                    <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs mb-3 border"
                      style={{ borderColor: "var(--border)", color: "var(--text-muted)", backgroundColor: "var(--bg-surface)" }}>
                      {city.dominant_pollutant}
                    </div>
                  )}

                  <CitySparkline city={city.city} width={200} height={36} />

                  {city.updated_at && (
                    <div className="text-[11px] mt-2 flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                      <Clock size={9} />
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
