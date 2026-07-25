"use client";
import { getAQIColor, getAQICategory, getTextColor } from "@/lib/aqi";

interface AQIBadgeProps {
  aqi: number | null | undefined;
  size?: "sm" | "md" | "lg";
}

export default function AQIBadge({ aqi, size = "md" }: AQIBadgeProps) {
  const color = getAQIColor(aqi);
  const textColor = getTextColor(color);
  const category = getAQICategory(aqi);

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5 font-medium",
    md: "text-sm px-3 py-1 font-semibold",
    lg: "text-3xl px-6 py-3 font-mono",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ${sizeClasses[size]}`}
      style={{ backgroundColor: color, color: textColor }}
      title={category ?? undefined}
    >
      {aqi != null ? aqi : "—"}
      {size !== "lg" && category && (
        <span className="opacity-80 text-[0.75em]">{category}</span>
      )}
    </span>
  );
}
