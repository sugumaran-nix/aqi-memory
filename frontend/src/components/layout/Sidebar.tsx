"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Building2, GitCompare, BarChart3, Info } from "lucide-react";

const NAV = [
  { href: "/",        label: "Home",         icon: Home },
  { href: "/cities",  label: "Cities",       icon: Building2 },
  { href: "/edits",   label: "Edit Tracker", icon: GitCompare },
  { href: "/compare", label: "Compare",      icon: BarChart3 },
  { href: "/about",   label: "About",        icon: Info },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden lg:flex flex-col fixed left-0 top-0 h-full border-r z-20"
      style={{
        width: 240,
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border)",
      }}
    >
      {/* Logo */}
      <div
        className="px-5 py-5 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <Link href="/" className="flex items-center gap-2 no-underline">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold"
            style={{ backgroundColor: "var(--accent)", color: "#000" }}
          >
            A
          </div>
          <span className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
            AQI Memory
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors no-underline"
              style={{
                color: isActive ? "var(--accent)" : "var(--text-muted)",
                backgroundColor: isActive ? "rgba(74,222,128,0.08)" : "transparent",
                borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
              }}
            >
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div
        className="px-5 py-4 border-t text-xs"
        style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
      >
        India&apos;s air quality archive
      </div>
    </aside>
  );
}
