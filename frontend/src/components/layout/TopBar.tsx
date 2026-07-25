"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sun, Moon, Github, Search, X } from "lucide-react";
import { useCities, useLiveStats } from "@/lib/api";
import AQIBadge from "@/components/ui/AQIBadge";

export default function TopBar() {
  const router = useRouter();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: cities } = useCities();
  const { data: stats } = useLiveStats();

  // Sync theme from DOM (set by anti-flash script)
  useEffect(() => {
    const stored = localStorage.getItem("theme") as "dark" | "light" | null;
    if (stored) setTheme(stored);
  }, []);

  function applyTheme(t: "dark" | "light") {
    setTheme(t);
    document.documentElement.classList.toggle("light", t === "light");
    localStorage.setItem("theme", t);
  }

  // Live indicator: last scrape < 90 minutes ago
  const isLive = (() => {
    if (!stats?.last_updated) return false;
    try {
      const s = stats.last_updated.replace(" IST", "").replace(" ", "T") + "Z";
      return Date.now() - new Date(s).getTime() < 90 * 60_000;
    } catch { return false; }
  })();

  const filtered = query.trim().length >= 2
    ? (cities ?? [])
        .filter(
          (c) =>
            c.city.toLowerCase().includes(query.toLowerCase()) ||
            c.state.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 8)
    : [];

  // Close dropdown on outside click
  const handleOutsideClick = useCallback((e: MouseEvent) => {
    if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
      setShowDropdown(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [handleOutsideClick]);

  function navigateToCity(city: string) {
    setQuery("");
    setShowDropdown(false);
    router.push(`/city/${encodeURIComponent(city.toLowerCase())}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setShowDropdown(false);
      setQuery("");
      inputRef.current?.blur();
    }
  }

  return (
    // KEY FIX: left-0 on mobile, sidebar-left (left: 240px) on lg+
    <header
      role="banner"
      className="fixed top-0 right-0 left-0 lg:sidebar-left z-20 flex items-center gap-3 px-4 lg:px-6 border-b no-print"
      style={{
        height: "var(--topbar-h)",
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border)",
      }}
    >
      {/* Search */}
      <div className="relative flex-1 max-w-sm" ref={searchRef}>
        <label htmlFor="city-search" className="sr-only">
          Search cities
        </label>
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--text-muted)" }}
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          id="city-search"
          type="search"
          autoComplete="off"
          placeholder="Search city…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
          onFocus={() => query.trim().length >= 2 && setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          aria-controls="city-search-results"
          aria-expanded={showDropdown && filtered.length > 0}
          aria-haspopup="listbox"
          className="w-full pl-8 pr-8 py-2 rounded-lg text-sm border outline-none"
          style={{
            backgroundColor: "var(--bg-card)",
            borderColor: "var(--border)",
            color: "var(--text-primary)",
          }}
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setShowDropdown(false); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded"
            aria-label="Clear search"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={13} aria-hidden="true" />
          </button>
        )}

        {/* Dropdown */}
        {showDropdown && filtered.length > 0 && (
          <ul
            id="city-search-results"
            role="listbox"
            aria-label="City search results"
            className="absolute top-full left-0 right-0 mt-1 rounded-lg border overflow-hidden z-50 shadow-xl"
            style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}
          >
            {filtered.map((c) => (
              <li key={c.city} role="option" aria-selected={false}>
                <button
                  onClick={() => navigateToCity(c.city)}
                  className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-left transition-colors hover:bg-white/5"
                  style={{ borderBottom: "1px solid var(--border)", color: "var(--text-primary)" }}
                >
                  <span>
                    {c.city}
                    <span className="text-xs ml-1.5" style={{ color: "var(--text-muted)" }}>
                      {c.state}
                    </span>
                  </span>
                  <AQIBadge aqi={c.latest_aqi} size="sm" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Live indicator */}
      {isLive && (
        <div
          className="hidden sm:flex items-center gap-1.5 text-xs font-medium shrink-0"
          style={{ color: "var(--accent)" }}
          aria-label="Data is live"
        >
          <span
            className="w-2 h-2 rounded-full pulse-dot shrink-0"
            style={{ backgroundColor: "var(--accent)" }}
            aria-hidden="true"
          />
          Live
        </div>
      )}

      {/* Theme toggle */}
      <button
        onClick={() => applyTheme(theme === "dark" ? "light" : "dark")}
        className="p-2 rounded-lg transition-colors hover:bg-white/5 shrink-0"
        style={{ color: "var(--text-muted)" }}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {theme === "dark"
          ? <Sun size={17} aria-hidden="true" />
          : <Moon size={17} aria-hidden="true" />
        }
      </button>

      {/* GitHub */}
      <a
        href="https://github.com/your-username/aqi-memory"
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-lg transition-colors hover:bg-white/5 shrink-0 hidden sm:block"
        style={{ color: "var(--text-muted)" }}
        aria-label="View source on GitHub (opens in new tab)"
      >
        <Github size={17} aria-hidden="true" />
      </a>
    </header>
  );
}
