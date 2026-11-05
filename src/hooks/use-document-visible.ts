"use client";

import { useSyncExternalStore } from "react";

// Only `visibilitychange` can change the snapshot; a `focus` listener just caused no-op checks.
function subscribe(callback: () => void) {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
}

const getSnapshot = () => document.visibilityState === "visible";
const getServerSnapshot = () => true;

/** True while the tab is visible. */
export function useDocumentVisible(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
