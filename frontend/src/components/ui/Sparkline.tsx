"use client";
import { getAQIColor } from "@/lib/aqi";

interface SparklineProps {
  data: (number | null)[];
  width?: number;
  height?: number;
}

export default function Sparkline({ data, width = 120, height = 32 }: SparklineProps) {
  const valid = data.filter((v): v is number => v != null);
  if (valid.length < 2) {
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <text x={width / 2} y={height / 2 + 4} textAnchor="middle" fontSize={9} fill="#6b7280">
          No data
        </text>
      </svg>
    );
  }

  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const range = max - min || 1;
  const padding = 3;

  const points = valid
    .map((v, i) => {
      const x = padding + (i / (valid.length - 1)) * (width - padding * 2);
      const y = height - padding - ((v - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const latest = valid[valid.length - 1];
  const strokeColor = getAQIColor(latest);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-label={`Sparkline, latest value ${latest}`}
    >
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.9}
      />
      {/* Latest value dot */}
      {(() => {
        const lastPt = points.split(" ").pop()?.split(",");
        if (!lastPt) return null;
        return (
          <circle
            cx={parseFloat(lastPt[0])}
            cy={parseFloat(lastPt[1])}
            r={2.5}
            fill={strokeColor}
          />
        );
      })()}
    </svg>
  );
}
