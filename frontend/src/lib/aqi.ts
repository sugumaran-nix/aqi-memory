import type { AQICategory } from "@/types";

const AQI_BREAKPOINTS: Array<[number, AQICategory, string]> = [
  [50,  "Good",         "#00B050"],
  [100, "Satisfactory", "#92D050"],
  [200, "Moderate",     "#FFFF00"],
  [300, "Poor",         "#FF9900"],
  [400, "Very Poor",    "#FF0000"],
  [500, "Severe",       "#800000"],
];

export function getAQIColor(aqi: number | null | undefined): string {
  if (aqi == null) return "#6b7280";
  for (const [threshold, , color] of AQI_BREAKPOINTS) {
    if (aqi <= threshold) return color;
  }
  return "#800000";
}

export function getAQICategory(aqi: number | null | undefined): AQICategory | null {
  if (aqi == null) return null;
  for (const [threshold, category] of AQI_BREAKPOINTS) {
    if (aqi <= threshold) return category;
  }
  return "Severe";
}

const HEALTH_ADVISORIES: Record<AQICategory, string> = {
  Good:         "Air quality is good. No health precautions needed.",
  Satisfactory: "Air quality is acceptable. Unusually sensitive people should limit outdoor exertion.",
  Moderate:     "People with respiratory or heart conditions should reduce outdoor activity.",
  Poor:         "Everyone may experience health effects. Sensitive groups should avoid outdoor activity.",
  "Very Poor":  "Health alert. Everyone should avoid prolonged outdoor exertion.",
  Severe:       "Health emergency. Everyone should avoid all outdoor activity.",
};

export function getHealthAdvisory(aqi: number | null | undefined): string {
  const cat = getAQICategory(aqi);
  if (!cat) return "No data available.";
  return HEALTH_ADVISORIES[cat];
}

/** Returns black for light backgrounds, white for dark ones (luminance check). */
export function getTextColor(bgHex: string): "#000000" | "#ffffff" {
  const hex = bgHex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  // Relative luminance
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 128 ? "#000000" : "#ffffff";
}

/** Format UTC datetime string as IST local string. */
export function formatTimestampIST(utcString: string | null | undefined): string {
  if (!utcString) return "—";
  try {
    // Handle "YYYY-MM-DD HH:MM:SS IST" already-converted strings
    if (utcString.includes("IST")) return utcString.replace(" IST", "");
    const dt = new Date(utcString.includes("T") ? utcString : utcString.replace(" ", "T") + "Z");
    return dt.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return utcString;
  }
}

export const POLLUTANT_COLORS: Record<string, string> = {
  pm25: "#f87171",
  pm10: "#fb923c",
  no2:  "#facc15",
  so2:  "#a78bfa",
  co:   "#60a5fa",
  o3:   "#34d399",
  nh3:  "#f472b6",
  pb:   "#94a3b8",
  aqi:  "#4ade80",
};

export const POLLUTANT_LABELS: Record<string, string> = {
  pm25: "PM2.5",
  pm10: "PM10",
  no2:  "NO₂",
  so2:  "SO₂",
  co:   "CO",
  o3:   "O₃",
  nh3:  "NH₃",
  pb:   "Pb",
  aqi:  "AQI",
};

export const FESTIVAL_DATES: Array<{ name: string; date: string }> = [
  { name: "Diwali",   date: "2022-10-24" },
  { name: "Diwali",   date: "2023-11-12" },
  { name: "Diwali",   date: "2024-10-31" },
  { name: "New Year", date: "2023-01-01" },
  { name: "New Year", date: "2024-01-01" },
  { name: "New Year", date: "2025-01-01" },
  { name: "New Year", date: "2026-01-01" },
  { name: "Holi",     date: "2023-03-08" },
  { name: "Holi",     date: "2024-03-25" },
  { name: "Holi",     date: "2025-03-14" },
];
