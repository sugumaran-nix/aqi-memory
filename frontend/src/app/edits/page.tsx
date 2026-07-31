"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp, Download } from "lucide-react";
import { format, subDays } from "date-fns";
import { useEdits, useEditStats, buildExportUrl } from "@/lib/api";
import DataTable, { Column } from "@/components/ui/DataTable";
import SkeletonCard from "@/components/ui/SkeletonCard";
import { formatTimestampIST } from "@/lib/aqi";
import type { EditLogItem } from "@/types";
import { Card, CardContent } from "@/components/ui/shadcn/card";
import { Badge } from "@/components/ui/shadcn/badge";
import NumberTicker from "@/components/magicui/number-ticker";

const SEVERITY_COLORS = { minor: "#facc15", moderate: "#fb923c", major: "#f87171" };

export default function EditsPage() {
  const [city, setCity] = useState("");
  const [severity, setSeverity] = useState("");
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [page, setPage] = useState(1);
  const [explainerOpen, setExplainerOpen] = useState(false);
  const [sortKey, setSortKey] = useState("detected_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data: edits, isLoading } = useEdits({
    city:       city || undefined,
    severity:   severity || undefined,
    start_date: startDate,
    end_date:   endDate,
    page,
    per_page:   50,
  });

  const { data: stats } = useEditStats();

  function handleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
    setPage(1);
  }

  const columns: Column<EditLogItem>[] = [
    {
      key: "detected_at",
      label: "Detected at",
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
          {formatTimestampIST(row.detected_at)}
        </span>
      ),
    },
    {
      key: "city",
      label: "City",
      render: (row) => <span style={{ color: "var(--text-primary)" }}>{row.city}</span>,
    },
    {
      key: "station_name",
      label: "Station",
      render: (row) => (
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{row.station_name}</span>
      ),
    },
    {
      key: "reading_timestamp",
      label: "Reading time",
      render: (row) => (
        <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
          {formatTimestampIST(row.reading_timestamp)}
        </span>
      ),
    },
    {
      key: "field_changed",
      label: "Field",
      render: (row) => (
        <span
          className="px-1.5 py-0.5 rounded text-xs font-mono border"
          style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
        >
          {row.field_changed.toUpperCase()}
        </span>
      ),
    },
    {
      key: "original_value",
      label: "Was",
      render: (row) => (
        <span className="font-mono" style={{ color: "#f87171" }}>
          {row.original_value?.toFixed(1) ?? "—"}
        </span>
      ),
    },
    {
      key: "new_value",
      label: "Became",
      render: (row) => (
        <span className="font-mono" style={{ color: "#4ade80" }}>
          {row.new_value?.toFixed(1) ?? "deleted"}
        </span>
      ),
    },
    {
      key: "change_pct",
      label: "Δ%",
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>
          {row.change_pct?.toFixed(1) ?? "—"}%
        </span>
      ),
    },
    {
      key: "severity",
      label: "Severity",
      sortable: true,
      render: (row) => {
        const color = SEVERITY_COLORS[row.severity] ?? "#6b7280";
        return (
          <Badge className="capitalize text-xs rounded-full"
            style={{ color, border: `1px solid ${color}40`, backgroundColor: `${color}12` }}
          >
            {row.severity}
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="page-fade px-5 lg:px-8 py-8 max-w-6xl mx-auto pb-24 lg:pb-10">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--danger)", boxShadow: "0 0 6px var(--danger)" }} />
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--danger)" }}>
            Live mutation log
          </span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-1" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          Edit Tracker
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Every time CPCB silently changes a published reading, we log it here permanently.
        </p>
      </div>

      {/* Explainer */}
      <div
        className="rounded-xl border mb-6 overflow-hidden"
        style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <button
          className="flex items-center justify-between w-full px-5 py-3 text-sm font-medium"
          style={{ color: "var(--text-primary)" }}
          onClick={() => setExplainerOpen(!explainerOpen)}
        >
          What are data edits?
          {explainerOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {explainerOpen && (
          <div className="px-5 pb-4 text-sm" style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border)" }}>
            <p className="mt-3">
              After CPCB publishes a reading, they sometimes quietly change the value — without any
              public announcement or correction notice. This is a problem for accountability.
            </p>
            <p className="mt-2">
              AQI Memory archives every reading the moment it&apos;s published. When we scrape an
              hour later and find a different value for the same timestamp, we log it as an edit.
            </p>
            <p className="mt-2">
              Severity is based on the percentage change: minor (&lt;5%), moderate (5–20%), or
              major (&gt;20%). Deleted readings — where a data point vanishes entirely — are always
              logged as major.
            </p>
          </div>
        )}
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total edits",    value: stats.total_edits_all_time },
            { label: "This month",     value: stats.edits_this_month },
            { label: "Major",          value: stats.edits_by_severity.major },
            { label: "Most edited",    value: stats.most_edited_city ?? "—" },
          ].map(({ label, value }) => (
            <Card
              key={label}
              className="stat-card card-hover text-center"
            >
              <CardContent className="pt-5 pb-5">
                <div className="text-2xl font-mono font-bold tracking-tight mb-0.5" style={{ color: "var(--text-primary)" }}>
                  {typeof value === "number"
                    ? <NumberTicker value={value} className="text-2xl font-mono font-bold" />
                    : value}
                </div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {label}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          type="text"
          placeholder="Filter by city…"
          value={city}
          onChange={(e) => { setCity(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border text-sm outline-none"
          style={{
            backgroundColor: "var(--bg-card)",
            borderColor: "var(--border)",
            color: "var(--text-primary)",
            minWidth: 160,
          }}
        />
        <input
          type="date"
          value={startDate}
          onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border text-sm"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }}
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border text-sm"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }}
        />
        <select
          value={severity}
          onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border text-sm"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)", color: "var(--text-primary)" }}
        >
          <option value="">All severities</option>
          <option value="minor">Minor</option>
          <option value="moderate">Moderate</option>
          <option value="major">Major</option>
        </select>

        <a
          href={buildExportUrl({ city: city || undefined, start_date: startDate, end_date: endDate })}
          download
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium no-underline border transition-colors hover:border-accent"
          style={{ borderColor: "var(--border)", color: "var(--text-muted)", backgroundColor: "var(--bg-card)" }}
        >
          <Download size={14} />
          Export CSV
        </a>
      </div>

      {/* Table */}
      {isLoading ? (
        <SkeletonCard lines={8} />
      ) : (
        <DataTable
          columns={columns}
          data={edits?.items ?? []}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          page={page}
          totalPages={edits?.pages ?? 1}
          onPage={setPage}
          rowKey={(row) => row.id}
          emptyMessage="No edits found for the selected filters"
        />
      )}
    </div>
  );
}
