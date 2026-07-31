"use client";
import { cn } from "@/lib/utils";
import { CSSProperties } from "react";

interface BorderBeamProps {
  className?: string;
  duration?: number;
  borderWidth?: number;
  colorFrom?: string;
  colorTo?: string;
  delay?: number;
}

/**
 * BorderBeam — animated rotating border glow.
 *
 * Uses a pseudo-element approach via inline styles + keyframe defined in globals.css.
 * The parent container needs: position:relative; overflow:hidden.
 *
 * Implementation: absolute inset element with conic-gradient background,
 * masked with WebkitMask to show only the border region.
 */
export default function BorderBeam({
  className,
  duration = 12,
  borderWidth = 1.5,
  colorFrom = "var(--accent)",
  colorTo = "#3b82f6",
  delay = 0,
}: BorderBeamProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 rounded-[inherit]", className)}
      style={{
        padding: `${borderWidth}px`,
        background: `conic-gradient(${colorFrom}, ${colorTo}, transparent, ${colorFrom})`,
        WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
        WebkitMaskComposite: "xor" as CSSProperties["WebkitMaskComposite"],
        maskComposite: "exclude",
        animation: `beam-rotate ${duration}s linear infinite`,
        animationDelay: delay > 0 ? `-${delay}s` : "0s",
      }}
    />
  );
}
