"use client";
import { useState } from "react";
import { AlertTriangle, CheckCircle, X } from "lucide-react";
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

  return (
    <div
      className="flex items-start gap-3 rounded-lg px-4 py-3"
      style={{ backgroundColor: bgColor, color: textColor }}
      role="alert"
    >
      <span className="flex-shrink-0 mt-0.5">
        {isWarning ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
      </span>
      <div className="flex-1">
        <span className="font-semibold text-sm">{category}: </span>
        <span className="text-sm">{advisory}</span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}
