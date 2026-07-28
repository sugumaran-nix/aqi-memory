"use client";
import { useState } from "react";
import { AlertTriangle, CheckCircle, X, Wind } from "lucide-react";
import { getAQIColor, getHealthAdvisory, getAQICategory, getTextColor } from "@/lib/aqi";

interface HealthAdvisoryProps {
  aqi: number | null | undefined;
}

export default function HealthAdvisory({ aqi }: HealthAdvisoryProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || aqi == null) return null;

  const category = getAQICategory(aqi);
  const advisory = getHealthAdvisory(aqi);
  const bgColor = getAQIColor(aqi);
  const textColor = getTextColor(bgColor);
  const isWarning = aqi > 100;
  const Icon = aqi > 200 ? AlertTriangle : aqi > 100 ? Wind : CheckCircle;

  return (
    <div
      className="flex items-start gap-3 rounded-xl px-4 py-3.5"
      style={{
        background: `linear-gradient(135deg, ${bgColor}ee 0%, ${bgColor}cc 100%)`,
        color: textColor,
        boxShadow: `0 4px 20px ${bgColor}40`,
      }}
      role="alert"
      aria-live="polite"
    >
      <span className="flex-shrink-0 mt-0.5">
        <Icon size={17} aria-hidden="true" />
      </span>
      <div className="flex-1 min-w-0">
        <span className="font-bold text-sm">{category}. </span>
        <span className="text-sm opacity-90">{advisory}</span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity rounded p-0.5"
        aria-label="Dismiss health advisory"
      >
        <X size={15} aria-hidden="true" />
      </button>
    </div>
  );
}
