"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Badge } from "@/components/ui/badge";
import { api, type Interest } from "@/lib/api";
import { notificationCount } from "@/lib/notification-count";

export function useNotificationCount() {
  const { session } = useAuth();
  const userId = session.user?.id;
  const role = session.user?.role;
  const onboarded = session.user?.onboarded;
  const [result, setResult] = useState({ userId: "", count: 0 });

  useEffect(() => {
    if (!userId || !role || !onboarded) return;
    let controller: AbortController | undefined;
    const refresh = async () => {
      if (document.visibilityState === "hidden") return;
      controller?.abort();
      const request = new AbortController();
      controller = request;
      try {
        const items = await api<Interest[]>("/interests", { signal: request.signal });
        if (!request.signal.aborted)
          setResult({ userId, count: notificationCount(items, role) });
      } catch {
        // Keep the last count on a temporary failure; the next refresh retries.
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    window.addEventListener("interests-changed", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller?.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("interests-changed", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [userId, role, onboarded]);

  return userId === result.userId ? result.count : 0;
}

export function NotificationBadge({ count, label }: { count: number; label: string }) {
  if (count === 0) return null;
  return (
    <Badge className="pointer-events-none absolute -right-2 -top-2 h-5 min-w-5 px-1 text-[11px] tabular-nums ring-2 ring-background">
      <span aria-hidden="true">{count > 99 ? "99+" : count}</span>
      <span className="sr-only">{count} {label}</span>
    </Badge>
  );
}
