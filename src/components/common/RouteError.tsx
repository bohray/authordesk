"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/common/ErrorState";

/**
 * Fallback for a route segment's `error.tsx`. Query errors are handled inline by each
 * feature; this only catches unexpected render errors so the portal shell stays usable.
 */
export function RouteError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      title="This page hit an unexpected error"
      error={new Error("Something went wrong while showing this page. Try again, or reload.")}
      onRetry={retry}
    />
  );
}
