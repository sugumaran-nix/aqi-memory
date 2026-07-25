export default function AboutPage() {
  return (
    <div className="page-fade px-4 lg:px-8 py-8 max-w-3xl mx-auto pb-24 lg:pb-8">
      <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
        About AQI Memory
      </h1>

      {/* Mission */}
      <section className="mb-10">
        <p className="text-base leading-relaxed mb-4" style={{ color: "var(--text-muted)" }}>
          India has over 560 air quality monitoring stations managed by the Central Pollution Control
          Board (CPCB). These stations publish hourly readings online — but what happens when those
          readings change after they&apos;ve been published? No notification. No correction notice.
          The number just silently becomes something else, and the original record disappears.
        </p>
        <p className="text-base leading-relaxed" style={{ color: "var(--text-muted)" }}>
          AQI Memory exists to prevent that. We scrape every active CPCB station every hour,
          permanently archive each reading the moment it appears, and automatically detect any
          retroactive changes to already-published data. The archive is cumulative and permanent —
          nothing is ever deleted, every historical value is preserved forever, and every data
          mutation is logged with the original value, the new value, and the timestamp of detection.
        </p>
      </section>

      {/* How it works */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-5" style={{ color: "var(--text-primary)" }}>
          How it works
        </h2>
        <div className="relative">
          {/* Connector line */}
          <div
            className="absolute left-5 top-8 bottom-8 w-px"
            style={{ backgroundColor: "var(--border)" }}
          />
          <div className="space-y-6">
            {[
              {
                step: "01",
                title: "Scrape",
                body: "Every 60 minutes, we POST to CPCB's Central Control Room (CCR) JSON API — the same backend that powers the official CPCB portal. We request all 8 pollutants (PM2.5, PM10, NO₂, SO₂, CO, O₃, NH₃, Pb) for each of the 560+ active stations.",
              },
              {
                step: "02",
                title: "Archive",
                body: "Every reading is permanently stored with two timestamps: the reading's own timestamp (when CPCB says the measurement was taken) and our scrape timestamp (when we retrieved it). The UNIQUE constraint is on (site_id, reading_timestamp, scraped_at) — so every historical state of every reading is preserved.",
              },
              {
                step: "03",
                title: "Compare",
                body: "Five minutes after each hourly scrape, we compare the new data against the previous scrape. For every reading timestamp that appears in both runs, we check all 9 numeric fields for changes. Any difference is classified by severity and logged into the edit_log table with the original value and the replacement.",
              },
            ].map(({ step, title, body }) => (
              <div key={step} className="flex gap-5 relative">
                <div
                  className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold font-mono"
                  style={{ backgroundColor: "var(--bg-card)", border: "2px solid var(--accent)", color: "var(--accent)" }}
                >
                  {step}
                </div>
                <div className="pt-2">
                  <h3 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                    {title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Methodology */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Data methodology
        </h2>
        <div className="space-y-4">
          {[
            {
              title: "Data source",
              body: "All readings come from CPCB's CCR (Central Control Room) backend API at app.cpcbccr.com. This is the same data source used by the official airquality.cpcb.gov.in portal. No third-party data providers or paid APIs are used.",
            },
            {
              title: "AQI calculation",
              body: "We calculate AQI using the official CPCB National AQI breakpoints for each of the 8 pollutants. The overall AQI is the maximum sub-index across all pollutants with valid readings. The dominant pollutant is the one with the highest sub-index.",
            },
            {
              title: "Edit detection logic",
              body: "An 'edit' is logged when the value for the same (station, reading_timestamp, field) differs between two consecutive scrape runs. Severity thresholds: minor < 5% change, moderate 5–20%, major > 20%. Missing readings (a previously-published reading_timestamp no longer present) are always logged as major severity.",
            },
            {
              title: "Data retention",
              body: "Hourly readings are retained for 90 days. Daily summaries (min/max/avg AQI per station per day) are retained permanently. The edit_log is retained permanently — every detected mutation is kept forever.",
            },
          ].map(({ title, body }) => (
            <div
              key={title}
              className="rounded-xl p-4 border"
              style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}
            >
              <h3 className="text-sm font-semibold mb-1.5" style={{ color: "var(--text-primary)" }}>
                {title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Press citations */}
      <section>
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Press
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl p-4 border"
              style={{
                backgroundColor: "transparent",
                borderColor: "var(--border)",
                borderStyle: "dashed",
              }}
            >
              <div
                className="text-xs uppercase tracking-wide mb-2 font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                Publication {i}
              </div>
              <div
                className="text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                Coverage pending
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
