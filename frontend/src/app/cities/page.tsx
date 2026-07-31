"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, Building2, MapPin } from "lucide-react";
import { useCities } from "@/lib/api";
import AQIBadge from "@/components/ui/AQIBadge";
import CitySparkline from "@/components/charts/CitySparkline";
import { Card } from "@/components/ui/shadcn/card";
import { Badge } from "@/components/ui/shadcn/badge";

export default function CitiesPage() {
  const { data: cities, isLoading, error } = useCities();
  const [query,  setQuery]  = useState("");
  const [sortBy, setSortBy] = useState<"city"|"aqi">("city");

  const filtered = useMemo(() =>
    (cities ?? [])
      .filter(c =>
        !query ||
        c.city.toLowerCase().includes(query.toLowerCase()) ||
        c.state.toLowerCase().includes(query.toLowerCase())
      )
      .sort((a,b) =>
        sortBy === "aqi"
          ? (b.latest_aqi ?? -1) - (a.latest_aqi ?? -1)
          : a.city.localeCompare(b.city)
      ),
    [cities, query, sortBy]
  );

  /* Group by state for the sidebar */
  const byState = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of cities ?? []) map[c.state] = (map[c.state] ?? 0) + 1;
    return Object.entries(map).sort((a,b) => b[1]-a[1]);
  }, [cities]);

  return (
    <div className="page-fade max-w-6xl mx-auto px-5 lg:px-8 py-8 pb-28 lg:pb-12">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Building2 size={14} style={{ color:"var(--accent)" }} />
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color:"var(--accent)" }}>
            Monitoring Network
          </span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-1"
          style={{ color:"var(--text-primary)", letterSpacing:"-0.02em" }}>
          All Cities
        </h1>
        <p className="text-sm" style={{ color:"var(--text-muted)" }}>
          {cities?.length ?? "…"} cities · {cities?.reduce((s,c)=>s+(c.station_count??0),0) ?? "…"} active stations
        </p>
      </div>

      {/* Filter bar */}
      <Card className="p-4 mb-8 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color:"var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Filter city or state…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm outline-none"
            style={{
              backgroundColor:"var(--bg-surface)", borderColor:"var(--border)",
              color:"var(--text-primary)",
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={13} style={{ color:"var(--text-muted)" }} />
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as "city"|"aqi")}
            className="px-3 py-2 rounded-lg border text-sm outline-none"
            style={{
              backgroundColor:"var(--bg-surface)", borderColor:"var(--border)",
              color:"var(--text-primary)",
            }}
          >
            <option value="city">Sort: A–Z</option>
            <option value="aqi">Sort: Worst AQI first</option>
          </select>
        </div>
        {query && (
          <span className="text-xs" style={{ color:"var(--text-muted)" }}>
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        )}

        {/* State chips */}
        {!query && byState.slice(0,6).map(([state, count]) => (
          <button key={state}
            onClick={() => setQuery(state)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            style={{ borderColor:"var(--border)", color:"var(--text-muted)", backgroundColor:"var(--bg-surface)" }}>
            <MapPin size={9} />
            {state}
            <span className="ml-0.5 opacity-60">({count})</span>
          </button>
        ))}
      </Card>

      {error && (
        <div className="text-sm mb-6 p-4 rounded-lg border"
          style={{ color:"var(--danger)", borderColor:"var(--danger)", backgroundColor:"rgba(239,68,68,0.06)" }}>
          Failed to load cities. Make sure the backend is running.
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(9)].map((_,i) => (
            <Card key={i} className="p-5 space-y-3">
              <div className="skeleton h-4 w-28 rounded" />
              <div className="skeleton h-3 w-20 rounded" />
              <div className="skeleton h-7 w-16 rounded-full" />
              <div className="skeleton h-8 w-full rounded" />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="py-20 text-center">
          <Building2 size={32} className="mx-auto mb-3" style={{ color:"var(--text-muted)" }} />
          <p className="text-sm font-medium" style={{ color:"var(--text-secondary)" }}>
            No cities match &ldquo;{query}&rdquo;
          </p>
          <p className="text-xs mt-1" style={{ color:"var(--text-muted)" }}>
            Try a different search term
          </p>
          <button onClick={() => setQuery("")}
            className="mt-4 text-xs underline" style={{ color:"var(--accent)" }}>
            Clear filter
          </button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(city => (
            <Link key={city.city}
              href={`/city/${encodeURIComponent(city.city.toLowerCase())}`}
              className="no-underline group">
              <Card className="p-5 card-hover h-full cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold" style={{ color:"var(--text-primary)" }}>{city.city}</div>
                    <div className="text-xs mt-0.5" style={{ color:"var(--text-muted)" }}>
                      {city.state}
                      {city.station_count > 0 && (
                        <span className="ml-2">· {city.station_count} station{city.station_count !== 1 ? "s" : ""}</span>
                      )}
                    </div>
                  </div>
                  <AQIBadge aqi={city.latest_aqi} size="md" />
                </div>
                {city.dominant_pollutant && (
                  <Badge variant="outline" className="text-xs mb-3">{city.dominant_pollutant}</Badge>
                )}
                <CitySparkline city={city.city} width={200} height={32} />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
