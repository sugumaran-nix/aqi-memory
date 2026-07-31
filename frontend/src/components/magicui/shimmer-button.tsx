"use client";
import React from "react";
import { cn } from "@/lib/utils";

interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  className?: string;
}

/**
 * ShimmerButton — a CTA button with a travelling shimmer highlight.
 * Uses a pure CSS linear-gradient animation — no container-type needed.
 */
export default function ShimmerButton({
  children,
  className,
  ...props
}: ShimmerButtonProps) {
  return (
    <button
      className={cn(
        "relative inline-flex items-center justify-center gap-2 overflow-hidden",
        "rounded-lg px-6 py-3 text-sm font-semibold text-black",
        "transition-all duration-150 hover:-translate-y-px hover:brightness-110 active:scale-[0.98]",
        className,
      )}
      style={{
        background: "var(--accent)",
        boxShadow: "0 0 20px rgba(0,229,160,0.3)",
      }}
      {...props}
    >
      {/* Shimmer overlay */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer-sweep_2.5s_ease-in-out_infinite]"
        style={{
          background:
            "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%)",
        }}
      />
      {children}
    </button>
  );
}
