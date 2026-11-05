"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { apiRoutes } from "@/constants/routes";
import { queryKeys } from "@/constants/queryKeys";
import { pollIntervalMs } from "@/constants/ui";
import { useDocumentVisible } from "@/hooks/useDocumentVisible";
import type { UpdatesDTO } from "@/shared/types/dto";

export type LiveScope = "author" | "admin";
export type LiveStatus = "connecting" | "live" | "paused" | "offline";

export interface LiveUpdatesState {
  status: LiveStatus;
  lastSyncedAt: string | null;
}

/**
 * Lightweight real-time: polls GET /updates?since=<cursor> while the tab is visible,
 * then invalidates only the queries that can be affected by the changed tickets.
 * Mount once per portal layout.
 */
export function useLiveUpdates(scope: LiveScope): LiveUpdatesState {
  const queryClient = useQueryClient();
  const visible = useDocumentVisible();
  const cursorRef = useRef<string | null>(null);
  const [state, setState] = useState<LiveUpdatesState>({
    status: "connecting",
    lastSyncedAt: null,
  });

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    let timer: number | undefined;
    const controller = new AbortController();

    const invalidate = (ids: string[]) => {
      if (scope === "admin") {
        void queryClient.invalidateQueries({ queryKey: queryKeys.adminTickets.lists() });
        void queryClient.invalidateQueries({ queryKey: queryKeys.adminStats });
        for (const id of ids) {
          void queryClient.invalidateQueries({ queryKey: queryKeys.adminTickets.detail(id) });
        }
      } else {
        void queryClient.invalidateQueries({ queryKey: queryKeys.authorTickets.lists() });
        for (const id of ids) {
          void queryClient.invalidateQueries({ queryKey: queryKeys.authorTickets.detail(id) });
        }
      }
    };

    const tick = async () => {
      // First poll after mount looks slightly back so nothing slips between page load and now.
      cursorRef.current ??= new Date(Date.now() - pollIntervalMs).toISOString();
      try {
        const res = await apiClient.get<UpdatesDTO>(
          apiRoutes.updates,
          { since: cursorRef.current },
          controller.signal,
        );
        if (cancelled) return;
        if (res?.serverTime) cursorRef.current = res.serverTime;
        const changed = res?.changed ?? [];
        if (changed.length > 0) invalidate([...new Set(changed.map((c) => c.id))]);
        setState({ status: "live", lastSyncedAt: res?.serverTime ?? new Date().toISOString() });
      } catch {
        if (cancelled) return;
        setState((s) => ({ ...s, status: "offline" }));
      }
      if (!cancelled) timer = window.setTimeout(tick, pollIntervalMs);
    };

    // Poll immediately on mount and whenever the tab becomes visible again.
    void tick();

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [visible, scope, queryClient]);

  return visible ? state : { ...state, status: "paused" };
}
