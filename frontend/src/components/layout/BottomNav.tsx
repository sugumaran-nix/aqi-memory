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
      className="fixed bottom-0 left-0 right-0 flex items-center justify-around lg:hidden z-20 no-print"
      style={{
        backgroundColor: "rgba(13, 17, 23, 0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderTop: "1px solid var(--border)",
        height: "var(--bottom-nav-h)",
      }}
    >
      {NAV.map(({ href, label, icon: Icon }) => {
        const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1 px-3 py-2 text-[10px] font-medium no-underline relative"
            style={{
              color: isActive ? "var(--accent)" : "var(--text-muted)",
              transition: "color 150ms",
            }}
          >
            {isActive && (
              <span
                className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b"
                style={{ backgroundColor: "var(--accent)" }}
              />
            )}
            <Icon size={20} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
