import { Wind, Database, Search, GitCompare, ExternalLink, Github, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/shadcn/card";
import { Badge } from "@/components/ui/shadcn/badge";
import { Separator } from "@/components/ui/shadcn/separator";
import { Button } from "@/components/ui/shadcn/button";
import BorderBeam from "@/components/magicui/border-beam";

const STACK = [
  { name:"FastAPI",       role:"Backend API & scheduler" },
  { name:"Turso (libSQL)",role:"Hosted SQLite database" },
  { name:"Next.js 14",    role:"Frontend (App Router)" },
  { name:"Tailwind CSS",  role:"Styling system" },
  { name:"shadcn/ui",     role:"UI component library" },
  { name:"Magic UI",      role:"Animated components" },
  { name:"Recharts",      role:"Data visualisation" },
  { name:"Render",        role:"Backend hosting (free)" },
  { name:"Vercel",        role:"Frontend hosting (free)" },
];

export default function AboutPage() {
  return (
    <div className="page-fade max-w-3xl mx-auto px-5 lg:px-8 py-8 pb-28 lg:pb-12">

      {/* Hero */}
      <div className="mb-12">
        <Badge variant="secondary" className="mb-4 gap-1.5">
          <Wind size={10} />
          Open source · Built in public · $0/month
        </Badge>
        <h1 className="text-3xl font-extrabold tracking-tight mb-4"
          style={{ color:"var(--text-primary)", letterSpacing:"-0.02em" }}>
          About AQI Memory
        </h1>
        <p className="text-base leading-[1.7] mb-4" style={{ color:"var(--text-secondary)" }}>
          India has over 560 air quality monitoring stations managed by the Central Pollution Control
          Board (CPCB). These stations publish hourly readings online — but what happens when those
          readings change after being published? No notification. No correction notice. The number
          just silently becomes something else, and the original record disappears.
        </p>
        <p className="text-base leading-[1.7]" style={{ color:"var(--text-secondary)" }}>
          AQI Memory exists to prevent that. We scrape every active CPCB station every hour,
          permanently archive each reading the moment it appears, and automatically detect any
          retroactive changes to already-published data. Every mutation is logged with the original
          value, the new value, and a timestamp — forever.
        </p>
      </div>

      <Separator className="mb-12" />

      {/* How it works */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-6" style={{ color:"var(--text-primary)" }}>How it works</h2>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-8 bottom-8 w-px"
            style={{ background:"linear-gradient(to bottom, var(--accent), var(--border))" }} />

          <div className="space-y-6">
            {[
              { step:"01", icon:Search, title:"Scrape",
                body:"Every 60 minutes we POST to CPCB's Central Control Room (CCR) JSON API — the same backend powering the official portal. We request all 8 pollutants (PM2.5, PM10, NO₂, SO₂, CO, O₃, NH₃, Pb) for each of the 560+ active stations." },
              { step:"02", icon:Database, title:"Archive",
                body:"Every reading is stored in Turso (hosted SQLite) with two timestamps: the reading's own timestamp and our scrape timestamp. The UNIQUE constraint on (site_id, reading_timestamp, scraped_at) preserves every historical state." },
              { step:"03", icon:GitCompare, title:"Detect",
                body:"Five minutes after each scrape, we compare new data against the previous run per-station. Any field that changed is logged with original value, replacement value, percentage change, and severity (minor <5%, moderate 5–20%, major >20%)." },
            ].map(({ step, icon:Icon, title, body }) => (
              <div key={step} className="flex gap-5 relative">
                <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor:"var(--bg-card)",
                    border:"2px solid var(--accent)",
                    boxShadow:"0 0 12px rgba(0,229,160,0.2)",
                  }}>
                  <Icon size={15} style={{ color:"var(--accent)" }} />
                </div>
                <div className="pt-2 flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-xs font-bold" style={{ color:"var(--text-muted)" }}>{step}</span>
                    <h3 className="text-sm font-bold" style={{ color:"var(--text-primary)" }}>{title}</h3>
                  </div>
                  <p className="text-sm leading-[1.65]" style={{ color:"var(--text-muted)" }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Separator className="mb-12" />

      {/* Methodology */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-5" style={{ color:"var(--text-primary)" }}>Data methodology</h2>
        <div className="space-y-3">
          {[
            { title:"Data source",
              body:"All readings come from CPCB's CCR backend API (app.cpcbccr.com) — the same source as airquality.cpcb.gov.in. No third-party providers or paid APIs." },
            { title:"AQI calculation",
              body:"Calculated using official CPCB National AQI breakpoints for each of the 8 pollutants. Overall AQI = max sub-index. Dominant pollutant = highest sub-index." },
            { title:"Edit detection",
              body:"An 'edit' is logged when the value for the same (station, reading_timestamp, field) differs between two consecutive scrapes. Per-station comparison prevents false positives from staggered scrape times." },
            { title:"Retention",
              body:"Raw hourly readings: 90 days (weekly cleanup). Daily summaries: permanent. Edit log: permanent — every detected mutation kept forever." },
          ].map(({ title, body }) => (
            <Card key={title} className="p-4 card-hover">
              <div className="flex gap-3">
                <CheckCircle size={14} className="mt-0.5 flex-shrink-0" style={{ color:"var(--accent)" }} />
                <div>
                  <h3 className="text-sm font-semibold mb-1" style={{ color:"var(--text-primary)" }}>{title}</h3>
                  <p className="text-sm leading-[1.65]" style={{ color:"var(--text-muted)" }}>{body}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <Separator className="mb-12" />

      {/* Tech stack */}
      <section className="mb-12">
        <h2 className="text-xl font-bold mb-5" style={{ color:"var(--text-primary)" }}>Tech stack</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {STACK.map(({ name, role }) => (
            <div key={name} className="rounded-lg border p-3"
              style={{ backgroundColor:"var(--bg-card)", borderColor:"var(--border)" }}>
              <div className="text-xs font-semibold mb-0.5" style={{ color:"var(--text-primary)" }}>{name}</div>
              <div className="text-[11px]" style={{ color:"var(--text-muted)" }}>{role}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Open source */}
      <section>
        <Card className="relative overflow-hidden p-6">
          <BorderBeam duration={10} />
          <h2 className="text-xl font-bold mb-2" style={{ color:"var(--text-primary)" }}>Open source</h2>
          <p className="text-sm mb-4" style={{ color:"var(--text-muted)" }}>
            MIT licensed. Contributions welcome.
          </p>
          <Button asChild variant="outline">
            <a href="https://github.com/sugumaran-nix/aqi-memory"
              target="_blank" rel="noopener noreferrer"
              className="no-underline gap-2">
              <Github size={15} />
              View on GitHub
              <ExternalLink size={12} />
            </a>
          </Button>
          <p className="text-xs mt-4" style={{ color:"var(--text-muted)" }}>
            Built by{" "}
            <a href="https://github.com/sugumaran-nix" target="_blank" rel="noopener noreferrer"
              style={{ color:"var(--accent)" }}>
              sugumaran-nix
            </a>
          </p>
        </Card>
      </section>
    </div>
  );
}
