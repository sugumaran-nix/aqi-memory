"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Building2, GitCompare, BarChart3, Info } from "lucide-react";

const NAV = [
  { href: "/",        label: "Home",    icon: Home },
  { href: "/cities",  label: "Cities",  icon: Building2 },
  { href: "/edits",   label: "Edits",   icon: GitCompare },
  { href: "/compare", label: "Compare", icon: BarChart3 },
  { href: "/about",   label: "About",   icon: Info },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex items-center justify-around border-t lg:hidden z-20"
      style={{
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border)",
        height: 56,
      }}
    >
      {NAV.map(({ href, label, icon: Icon }) => {
        const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] no-underline transition-colors"
            style={{ color: isActive ? "var(--accent)" : "var(--text-muted)" }}
          >
            <Icon size={20} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
