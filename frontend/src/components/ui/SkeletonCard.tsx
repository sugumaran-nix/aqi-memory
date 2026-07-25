"use client";

interface SkeletonCardProps {
  lines?: number;
  className?: string;
}

export default function SkeletonCard({ lines = 3, className = "" }: SkeletonCardProps) {
  return (
    <div
      className={`rounded-xl p-5 border ${className}`}
      style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      <div className="skeleton h-5 w-1/2 mb-4 rounded" />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton mb-3 rounded"
          style={{
            height: "12px",
            width: i === lines - 1 ? "60%" : "100%",
          }}
        />
      ))}
    </div>
  );
}
