"use client";
import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
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
    <div className="page-fade px-4 lg:px-8 py-8 max-w-6xl mx-auto pb-24 lg:pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
          All Cities
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {cities?.length ?? "…"} cities with active CPCB monitoring stations
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search city or state…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-lg border text-sm outline-none"
            style={{
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "city" | "aqi")}
          className="px-3 py-2 rounded-lg border text-sm"
          style={{
            backgroundColor: "var(--bg-card)",
            borderColor: "var(--border)",
            color: "var(--text-primary)",
          }}
        >
          <option value="city">Sort: A–Z</option>
          <option value="aqi">Sort: Worst AQI first</option>
        </select>
      </div>

      {error && (
        <div className="text-sm mb-4" style={{ color: "var(--danger)" }}>
          Failed to load cities. Make sure the backend is running.
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => <SkeletonCard key={i} lines={3} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm" style={{ color: "var(--text-muted)" }}>
          No cities match &ldquo;{query}&rdquo;
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((city) => (
            <Link
              key={city.city}
              href={`/city/${encodeURIComponent(city.city.toLowerCase())}`}
              className="no-underline group"
            >
              <div
                className="rounded-xl p-5 border h-full transition-colors group-hover:border-accent"
                style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold" style={{ color: "var(--text-primary)" }}>
                      {city.city}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {city.state} · {city.station_count} station{city.station_count !== 1 ? "s" : ""}
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

                <CitySparkline city={city.city} width={200} height={32} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
