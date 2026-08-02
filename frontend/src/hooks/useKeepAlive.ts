import { useEffect } from "react";

/**
 * Pings /api/backend/ping every 4 minutes to prevent Render free-tier cold starts.
 * Render spins down after 15 min of inactivity — this keeps it warm.
 */
export function useKeepAlive() {
  useEffect(() => {
    const ping = () =>
      fetch("/api/backend/ping", { method: "GET" }).catch(() => {});

    ping(); // immediate ping on mount
    const id = setInterval(ping, 4 * 60 * 1000); // every 4 min
    return () => clearInterval(id);
  }, []);
}
