"use client";

interface SkeletonCardProps {
  lines?: number;
}

export default function SkeletonCard({ lines = 3 }: SkeletonCardProps) {
  return (
    <div
      className="rounded-xl p-5 border"
      style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2 flex-1">
          <div className="skeleton h-4 w-28 rounded" />
          <div className="skeleton h-3 w-16 rounded" />
        </div>
        <div className="skeleton h-7 w-16 rounded-full" />
      </div>
      <div className="space-y-2">
        {[...Array(lines - 2 > 0 ? lines - 2 : 1)].map((_, i) => (
          <div key={i} className={`skeleton h-3 rounded ${i % 2 === 0 ? "w-full" : "w-3/4"}`} />
        ))}
      </div>
    </div>
  );
}
