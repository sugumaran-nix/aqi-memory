"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, Building2 } from "lucide-react";
import { useCities } from "@/lib/api";
import AQIBadge from "@/components/ui/AQIBadge";
import SkeletonCard from "@/components/ui/SkeletonCard";
import CitySparkline from "@/components/charts/CitySparkline";

export default function CitiesPage() {
  const { data: cities, isLoading, error } = useCities();
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"city" | "aqi">("city");

  const filtered = (cities ?? [])
    .filter(
      (c) =>
        !query ||
        c.city.toLowerCase().includes(query.toLowerCase()) ||
        c.state.toLowerCase().includes(query.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "aqi") return (b.latest_aqi ?? -1) - (a.latest_aqi ?? -1);
      return a.city.localeCompare(b.city);
    });

  return (
    <div className="page-fade px-5 lg:px-8 py-8 max-w-6xl mx-auto pb-24 lg:pb-10">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Building2 size={16} style={{ color: "var(--accent)" }} />
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--accent)" }}>
            All Cities
          </span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-1" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          India&apos;s Monitoring Network
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {cities?.length ?? "…"} cities with active CPCB monitoring stations
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-8 p-4 rounded-xl border"
        style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Filter by city or state…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm outline-none"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} style={{ color: "var(--text-muted)" }} />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "city" | "aqi")}
            className="px-3 py-2 rounded-lg border text-sm outline-none"
            style={{
              backgroundColor: "var(--bg-surface)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
          >
            <option value="city">Sort: A–Z</option>
            <option value="aqi">Sort: Worst AQI first</option>
          </select>
        </div>
        {query && (
          <div className="flex items-center text-xs" style={{ color: "var(--text-muted)" }}>
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {error && (
        <div className="text-sm mb-6 p-4 rounded-lg border"
          style={{ color: "var(--danger)", borderColor: "var(--danger)", backgroundColor: "rgba(239,68,68,0.06)" }}>
          Failed to load cities. Make sure the backend is running.
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => <SkeletonCard key={i} lines={3} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 rounded-xl border"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
          <Building2 size={32} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            No cities match &ldquo;{query}&rdquo;
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Try a different search term</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((city) => (
            <Link
              key={city.city}
              href={`/city/${encodeURIComponent(city.city.toLowerCase())}`}
              className="no-underline group"
            >
              <div className="rounded-xl p-5 border card-hover h-full"
                style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold" style={{ color: "var(--text-primary)" }}>{city.city}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {city.state} · {city.station_count} station{city.station_count !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <AQIBadge aqi={city.latest_aqi} size="md" />
                </div>

                {city.dominant_pollutant && (
                  <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs mb-3 border"
                    style={{ borderColor: "var(--border)", color: "var(--text-muted)", backgroundColor: "var(--bg-surface)" }}>
                    {city.dominant_pollutant}
                  </div>
                )}

                <CitySparkline city={city.city} width={200} height={32} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
