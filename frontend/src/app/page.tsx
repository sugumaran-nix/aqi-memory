"use client";
import Link from "next/link";
import { ArrowRight, Wind, Shield, TrendingUp, Clock, ChevronRight, Zap } from "lucide-react";
import { useLiveStats, useCities, useEdits } from "@/lib/api";
import AQIBadge from "@/components/ui/AQIBadge";
import CitySparkline from "@/components/charts/CitySparkline";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/shadcn/card";
import { Badge } from "@/components/ui/shadcn/badge";
import { Button } from "@/components/ui/shadcn/button";
import NumberTicker from "@/components/magicui/number-ticker";
import AnimatedGradientText from "@/components/magicui/animated-gradient-text";
import BorderBeam from "@/components/magicui/border-beam";
import Marquee from "@/components/magicui/marquee";
import { formatTimestampIST } from "@/lib/aqi";
import { AreaChart, Metric, Text, Flex, BadgeDelta } from "@tremor/react";

const SEVERITY_COLOR = { minor: "#f59e0b", moderate: "#f97316", major: "#ef4444" } as const;
const SEVERITY_BG    = { minor: "rgba(245,158,11,0.08)", moderate: "rgba(249,115,22,0.08)", major: "rgba(239,68,68,0.08)" } as const;

const CITY_CHIPS = [
  "Delhi","Mumbai","Kolkata","Chennai","Bengaluru","Hyderabad","Ahmedabad",
  "Pune","Jaipur","Lucknow","Kanpur","Nagpur","Patna","Indore","Surat",
];

export default function HomePage() {
  const { data: stats, isLoading: statsLoading } = useLiveStats();
  const { data: cities, isLoading: citiesLoading } = useCities();
  const { data: edits, isLoading: editsLoading } = useEdits({ per_page: 6 });

  const spotlightCities = (cities ?? []).slice(0, 6);

  const isLive = (() => {
    if (!stats?.last_updated) return false;
    try {
      const s = stats.last_updated.replace(" IST","").replace(" ","T")+"Z";
      return Date.now() - new Date(s).getTime() < 90 * 60_000;
    } catch { return false; }
  })();

  // Tremor AreaChart data: edits per severity this week (for mini sparkline)
  const editChartData = edits?.items.slice(0,10).map((e, i) => ({
    idx: String(i + 1),
    minor:    e.severity === "minor"    ? Math.abs(e.change_pct ?? 5) : 0,
    moderate: e.severity === "moderate" ? Math.abs(e.change_pct ?? 12) : 0,
    major:    e.severity === "major"    ? Math.abs(e.change_pct ?? 35) : 0,
  })) ?? [];

  return (
    <div className="page-fade max-w-6xl mx-auto px-5 lg:px-8 py-8 pb-28 lg:pb-12">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="mb-16 pt-2">
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wider uppercase mb-6"
          style={{ color:"var(--accent)", borderColor:"rgba(0,229,160,0.25)", backgroundColor:"rgba(0,229,160,0.07)" }}>
          <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ backgroundColor:"var(--accent)" }} />
          {isLive ? "Live data" : "AQI Memory"} · India&apos;s Air Archive
        </div>

        <h1 className="text-5xl lg:text-7xl font-extrabold leading-[1.05] tracking-[-0.04em] mb-5">
          India&apos;s air quality.<br />
          <AnimatedGradientText>Unedited. Forever.</AnimatedGradientText>
        </h1>

        <p className="text-lg leading-relaxed mb-8 max-w-xl" style={{ color:"var(--text-secondary)" }}>
          Archiving readings from{" "}
          <strong style={{ color:"var(--text-primary)" }}>560+ CPCB monitoring stations</strong>{" "}
          every hour — and catching silent data edits in real time.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/cities" className="no-underline gap-2">
              Explore cities <ArrowRight size={16} />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/edits" className="no-underline gap-2">
              See caught edits <ChevronRight size={16} />
            </Link>
          </Button>
        </div>
      </section>

      {/* ── Tremor Metric stat cards ──────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16">
        {[
          { label:"Stations monitored", icon:Shield, val: stats?.total_stations, delta:"increase", desc:"CPCB stations" },
          { label:"Readings archived",  icon:Clock,  val: stats?.total_readings,  delta:"increase", desc:"Total data points" },
          { label:"Edits caught today", icon:TrendingUp, val: stats?.edits_caught_today, delta: (stats?.edits_caught_today ?? 0) > 0 ? "moderateDecrease" : "unchanged", desc:"Mutations flagged" },
        ].map(({ label, icon:Icon, val, delta, desc }) => (
          <Card key={label} className="stat-card card-hover p-5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
              style={{ backgroundColor:"var(--color-primary-glow)", border:"1px solid rgba(0,229,160,0.2)" }}>
              <Icon size={15} style={{ color:"var(--accent)" }} />
            </div>
            {statsLoading || val == null ? (
              <div className="skeleton h-10 w-24 rounded mb-2" />
            ) : (
              <Flex alignItems="baseline" className="gap-2 mb-1">
                <Metric className="font-mono text-3xl font-bold" style={{ color:"var(--text-primary)" }}>
                  <NumberTicker value={val} />
                </Metric>
                <BadgeDelta deltaType={delta as Parameters<typeof BadgeDelta>[0]["deltaType"]} className="text-xs">
                  {label.includes("Edits") ? (val > 0 ? "active" : "clean") : "active"}
                </BadgeDelta>
              </Flex>
            )}
            <Text className="text-sm font-medium" style={{ color:"var(--text-secondary)" }}>{label}</Text>
            <Text className="text-xs" style={{ color:"var(--text-muted)" }}>{desc}</Text>
          </Card>
        ))}
      </section>

      {/* ── City marquee ─────────────────────────────────────── */}
      <div className="mb-16 overflow-hidden">
        <Marquee pauseOnHover className="[--duration:30s]">
          {CITY_CHIPS.map(city => (
            <Link key={city} href={`/city/${city.toLowerCase()}`} className="no-underline mx-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                style={{ borderColor:"var(--border)", color:"var(--text-secondary)", backgroundColor:"var(--bg-card)" }}>
                <Wind size={9} />{city}
              </span>
            </Link>
          ))}
        </Marquee>
      </div>

      {/* ── Edits + area chart ────────────────────────────────── */}
      <section className="mb-16">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold" style={{ color:"var(--text-primary)" }}>Latest edits caught</h2>
            <p className="text-sm mt-0.5" style={{ color:"var(--text-muted)" }}>Real-time mutation detection across all stations</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/edits" className="no-underline gap-1">View all <ArrowRight size={13} /></Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Edits table */}
          <Card className="lg:col-span-2 relative overflow-hidden">
            <BorderBeam duration={12} colorFrom="var(--accent)" colorTo="#3b82f6" />
            {editsLoading ? (
              <CardContent className="p-6 space-y-3">
                {[...Array(4)].map((_,i) => <div key={i} className="skeleton h-4 rounded w-full" />)}
              </CardContent>
            ) : !edits?.items.length ? (
              <CardContent className="py-16 text-center">
                <Shield size={28} className="mx-auto mb-3" style={{ color:"var(--accent)" }} />
                <p className="text-sm" style={{ color:"var(--text-muted)" }}>No edits detected yet — archive is clean.</p>
              </CardContent>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom:"1px solid var(--border)", backgroundColor:"var(--bg-surface)" }}>
                      {["Time","City","Was → Now","Severity"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest"
                          style={{ color:"var(--text-muted)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {edits.items.map(edit => {
                      const sev = edit.severity as keyof typeof SEVERITY_COLOR;
                      return (
                        <tr key={edit.id} className="transition-colors hover:bg-white/[0.02]"
                          style={{ borderBottom:"1px solid var(--border-subtle)" }}>
                          <td className="px-4 py-3 font-mono text-xs" style={{ color:"var(--text-muted)" }}>
                            {formatTimestampIST(edit.detected_at)}
                          </td>
                          <td className="px-4 py-3 font-medium text-xs" style={{ color:"var(--text-primary)" }}>{edit.city}</td>
                          <td className="px-4 py-3 font-mono text-xs">
                            <span style={{ color:"#f87171" }}>{edit.original_value?.toFixed(1) ?? "—"}</span>
                            <span style={{ color:"var(--text-muted)" }}> → </span>
                            <span style={{ color:"var(--accent)" }}>{edit.new_value?.toFixed(1) ?? "del"}</span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className="capitalize text-xs px-2.5 py-0.5 rounded-full border"
                              style={{ color:SEVERITY_COLOR[sev], backgroundColor:SEVERITY_BG[sev], borderColor:`${SEVERITY_COLOR[sev]}30` }}>
                              {edit.severity}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Tremor mini area chart */}
          <Card className="p-5">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-xs uppercase tracking-widest" style={{ color:"var(--text-muted)" }}>
                Edit severity (last 10)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {editChartData.length > 0 ? (
                <AreaChart
                  data={editChartData}
                  index="idx"
                  categories={["minor","moderate","major"]}
                  colors={["yellow","orange","red"]}
                  showLegend
                  showGridLines={false}
                  showXAxis={false}
                  className="h-36"
                  valueFormatter={v => `${v.toFixed(1)}%`}
                />
              ) : (
                <div className="h-36 flex items-center justify-center text-xs" style={{ color:"var(--text-muted)" }}>
                  Edits will appear here after 2 scrape cycles
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── City Spotlight ───────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold" style={{ color:"var(--text-primary)" }}>City spotlight</h2>
            <p className="text-sm mt-0.5" style={{ color:"var(--text-muted)" }}>Latest readings from major cities</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/cities" className="no-underline gap-1">All cities <ArrowRight size={13} /></Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {citiesLoading
            ? [...Array(6)].map((_,i) => (
                <Card key={i} className="p-5 space-y-3">
                  <div className="skeleton h-4 w-28 rounded" />
                  <div className="skeleton h-3 w-16 rounded" />
                  <div className="skeleton h-7 w-16 rounded-full" />
                  <div className="skeleton h-8 w-full rounded" />
                </Card>
              ))
            : spotlightCities.map(city => (
                <Link key={city.city} href={`/city/${encodeURIComponent(city.city.toLowerCase())}`} className="no-underline group">
                  <Card className="p-5 card-hover h-full cursor-pointer">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-semibold" style={{ color:"var(--text-primary)" }}>{city.city}</div>
                        <div className="text-xs mt-0.5" style={{ color:"var(--text-muted)" }}>{city.state}</div>
                      </div>
                      <AQIBadge aqi={city.latest_aqi} size="md" />
                    </div>
                    {city.dominant_pollutant && (
                      <Badge variant="outline" className="text-xs mb-3">{city.dominant_pollutant}</Badge>
                    )}
                    <CitySparkline city={city.city} width={200} height={36} />
                    {city.updated_at && (
                      <div className="flex items-center gap-1 mt-2 text-[11px]" style={{ color:"var(--text-muted)" }}>
                        <Clock size={9} />{city.updated_at}
                      </div>
                    )}
                  </Card>
                </Link>
              ))
          }
        </div>
      </section>
    </div>
  );
}
