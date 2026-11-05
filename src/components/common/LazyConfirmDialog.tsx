"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { ConfirmDialogProps } from "@/components/common/ConfirmDialog";

const ConfirmDialog = dynamic(() =>
  import("@/components/common/ConfirmDialog").then((m) => m.ConfirmDialog),
);

/**
 * Code-split ConfirmDialog. Nothing is loaded or mounted until the dialog is first opened;
 * after that it stays mounted so the close animation can play.
 */
export function LazyConfirmDialog(props: ConfirmDialogProps) {
  const [hasOpened, setHasOpened] = useState(props.open);
  // Adjusting state while rendering (not in an effect) avoids an extra commit.
  if (props.open && !hasOpened) setHasOpened(true);
  return hasOpened ? <ConfirmDialog {...props} /> : null;
}
