"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Building2, GitCompare, BarChart3, Info, Wind } from "lucide-react";

const NAV = [
  { href: "/",        label: "Dashboard",    icon: Home },
  { href: "/cities",  label: "Cities",       icon: Building2 },
  { href: "/edits",   label: "Edit Tracker", icon: GitCompare },
  { href: "/compare", label: "Compare",      icon: BarChart3 },
  { href: "/about",   label: "About",        icon: Info },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden lg:flex flex-col fixed left-0 top-0 h-full z-20"
      style={{
        width: "var(--sidebar-w)",
        backgroundColor: "var(--bg-surface)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Logo */}
      <div className="px-5 py-6" style={{ borderBottom: "1px solid var(--border)" }}>
        <Link href="/" className="flex items-center gap-3 no-underline group">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, var(--accent) 0%, #34d399 100%)",
              boxShadow: "0 0 12px rgba(0,229,160,0.3)",
            }}
          >
            <Wind size={16} color="#000" />
          </div>
          <div>
            <div className="font-bold text-sm leading-none" style={{ color: "var(--text-primary)" }}>
              AQI Memory
            </div>
            <div className="text-[10px] mt-0.5 font-medium tracking-wider uppercase" style={{ color: "var(--text-muted)" }}>
              Air Archive
            </div>
          </div>
        </Link>
      </div>

      {/* Nav label */}
      <div className="px-5 pt-5 pb-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
          Navigation
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium no-underline relative group"
              style={{
                color: isActive ? "var(--accent)" : "var(--text-secondary)",
                backgroundColor: isActive ? "var(--color-primary-glow)" : "transparent",
                transition: "all 150ms ease-out",
              }}
            >
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r"
                  style={{ backgroundColor: "var(--accent)" }}
                />
              )}
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer badge */}
      <div className="mx-3 mb-4 p-3 rounded-lg" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ backgroundColor: "var(--accent)" }} />
          <span className="text-xs font-medium" style={{ color: "var(--accent)" }}>Live monitoring</span>
        </div>
        <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
          560+ CPCB stations tracked every hour
        </p>
      </div>
    </aside>
  );
}
