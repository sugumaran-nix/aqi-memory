"use client";
import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export default function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-[60px] left-0 right-0 z-50 flex items-center justify-center gap-2 py-2 text-sm font-medium"
      style={{ backgroundColor: "#92400e", color: "#fef3c7" }}
    >
      <WifiOff size={14} aria-hidden="true" />
      You&apos;re offline — showing cached data
    </div>
  );
}
