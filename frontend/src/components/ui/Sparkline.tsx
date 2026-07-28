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
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        <text x={width / 2} y={height / 2 + 4} textAnchor="middle" fontSize={9} fill="#4d6178">
          No data
        </text>
      </svg>
    );
  }

  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const range = max - min || 1;
  const px = 2;

  const pts = valid.map((v, i) => {
    const x = px + (i / (valid.length - 1)) * (width - px * 2);
    const y = height - px - ((v - min) / range) * (height - px * 2);
    return [x, y] as [number, number];
  });

  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  // Closed fill path
  const fill = `${line} L${pts[pts.length - 1][0].toFixed(1)},${height} L${pts[0][0].toFixed(1)},${height} Z`;

  const latest = valid[valid.length - 1];
  const color = getAQIColor(latest);
  const lastPt = pts[pts.length - 1];
  const gradId = `sg-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-label={`Air quality trend, latest: ${latest}`}
      role="img"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Fill */}
      <path d={fill} fill={`url(#${gradId})`} />

      {/* Line */}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Latest dot */}
      <circle cx={lastPt[0]} cy={lastPt[1]} r={2.5} fill={color} />
      <circle cx={lastPt[0]} cy={lastPt[1]} r={4} fill={color} opacity={0.2} />
    </svg>
  );
}
