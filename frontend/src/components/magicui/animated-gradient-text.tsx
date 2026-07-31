import { cn } from "@/lib/utils";
import React from "react";

export default function AnimatedGradientText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline animate-gradient bg-gradient-to-r from-[var(--accent)] via-[#60a5fa] to-[var(--accent)] bg-[length:200%_auto] bg-clip-text text-transparent",
        className,
      )}
    >
      {children}
    </span>
  );
}
