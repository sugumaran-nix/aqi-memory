import { Wind, Database, Search, GitCompare, ExternalLink, Github } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="page-fade px-5 lg:px-8 py-8 max-w-3xl mx-auto pb-24 lg:pb-10">

      {/* Hero */}
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 text-xs font-semibold tracking-wider uppercase"
          style={{
            color: "var(--accent)",
            backgroundColor: "var(--color-primary-glow)",
            border: "1px solid rgba(0,229,160,0.2)",
          }}>
          <Wind size={11} />
          Open source · Built in public
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-3" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          About AQI Memory
        </h1>
        <p className="text-base leading-relaxed mb-4" style={{ color: "var(--text-secondary)", lineHeight: "1.7" }}>
          India has over 560 air quality monitoring stations managed by the Central Pollution Control
          Board (CPCB). These stations publish hourly readings online — but what happens when those
          readings change after they&apos;ve been published? No notification. No correction notice.
          The number just silently becomes something else, and the original record disappears.
        </p>
        <p className="text-base leading-relaxed" style={{ color: "var(--text-secondary)", lineHeight: "1.7" }}>
          AQI Memory exists to prevent that. We scrape every active CPCB station every hour,
          permanently archive each reading the moment it appears, and automatically detect any
          retroactive changes to already-published data. Every data mutation is logged with the
          original value, the new value, and the timestamp of detection — forever.
        </p>
      </div>

      {/* How it works */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
          How it works
        </h2>
        <div className="relative">
          <div className="absolute left-5 top-8 bottom-8 w-px"
            style={{ background: "linear-gradient(to bottom, var(--accent), var(--border))" }} />
          <div className="space-y-6">
            {[
              {
                step: "01", icon: Search, title: "Scrape",
                body: "Every 60 minutes, we POST to CPCB's Central Control Room (CCR) JSON API — the same backend that powers the official CPCB portal. We request all 8 pollutants (PM2.5, PM10, NO₂, SO₂, CO, O₃, NH₃, Pb) for each of the 560+ active stations.",
              },
              {
                step: "02", icon: Database, title: "Archive",
                body: "Every reading is permanently stored with two timestamps: the reading's own timestamp (when CPCB says the measurement was taken) and our scrape timestamp (when we retrieved it). The UNIQUE constraint on (site_id, reading_timestamp, scraped_at) preserves every historical state.",
              },
              {
                step: "03", icon: GitCompare, title: "Compare",
                body: "Five minutes after each hourly scrape, we compare the new data against the previous run. For every reading timestamp that appears in both runs, we check all 9 numeric fields. Any difference is classified by severity and logged with the original and replacement values.",
              },
            ].map(({ step, icon: Icon, title, body }) => (
              <div key={step} className="flex gap-5 relative">
                <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    border: "2px solid var(--accent)",
                    boxShadow: "0 0 12px rgba(0,229,160,0.2)",
                  }}>
                  <Icon size={15} style={{ color: "var(--accent)" }} />
                </div>
                <div className="pt-2 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold" style={{ color: "var(--text-muted)" }}>{step}</span>
                    <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{title}</h3>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)", lineHeight: "1.65" }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Methodology */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-5" style={{ color: "var(--text-primary)" }}>
          Data methodology
        </h2>
        <div className="space-y-3">
          {[
            {
              title: "Data source",
              body: "All readings come from CPCB's CCR (Central Control Room) backend API at app.cpcbccr.com. This is the same data source used by the official airquality.cpcb.gov.in portal. No third-party data providers or paid APIs are used.",
            },
            {
              title: "AQI calculation",
              body: "AQI is calculated using the official CPCB National AQI breakpoints for each of the 8 pollutants. The overall AQI is the maximum sub-index across all pollutants with valid readings. The dominant pollutant is the one with the highest sub-index.",
            },
            {
              title: "Edit detection logic",
              body: "An 'edit' is logged when the value for the same (station, reading_timestamp, field) differs between two consecutive scrape runs. Severity thresholds: minor < 5% change, moderate 5–20%, major > 20%. Missing readings are always logged as major severity.",
            },
            {
              title: "Data retention",
              body: "Hourly readings are retained for 90 days. Daily summaries (min/max/avg AQI per station per day) are retained permanently. The edit_log is retained permanently — every detected mutation is kept forever.",
            },
          ].map(({ title, body }) => (
            <div key={title} className="rounded-xl p-4 border card-hover"
              style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
              <h3 className="text-sm font-semibold mb-1.5" style={{ color: "var(--text-primary)" }}>{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)", lineHeight: "1.65" }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Links */}
      <section>
        <h2 className="text-xl font-bold mb-5" style={{ color: "var(--text-primary)" }}>Open source</h2>
        <div className="flex flex-wrap gap-3">
          <a href="https://github.com/sugumaran-nix/aqi-memory"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium no-underline btn-ghost">
            <Github size={15} />
            View on GitHub
            <ExternalLink size={12} />
          </a>
        </div>
        <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
          MIT licensed. Contributions welcome. Built by{" "}
          <a href="https://github.com/sugumaran-nix" target="_blank" rel="noopener noreferrer"
            style={{ color: "var(--accent)" }}>
            sugumaran-nix
          </a>.
        </p>
      </section>
    </div>
  );
}
