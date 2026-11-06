"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";

/**
 * Full-screen "please wait" overlay for actions that end in a navigation (e.g. sign-out).
 * Everything else on the page is made `inert`, so it can't be clicked, tabbed to or read by
 * screen readers until the overlay goes away, leaving no half-finished state to act on.
 */
export function BlockingOverlay({ message }: { message: string }) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const overlay = overlayRef.current;
    const blocked = Array.from(document.body.children).filter(
      (el) => el !== overlay && !el.hasAttribute("inert"),
    );
    blocked.forEach((el) => el.setAttribute("inert", ""));
    return () => blocked.forEach((el) => el.removeAttribute("inert"));
  }, []);

  return createPortal(
    <div
      ref={overlayRef}
      role="status"
      aria-live="assertive"
      aria-busy="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in-0"
    >
      <div className="flex items-center gap-3 rounded-xl border bg-card px-5 py-3 text-sm font-medium shadow-card">
        <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
        {message}
      </div>
    </div>,
    document.body,
  );
}
