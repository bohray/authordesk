"use client";

import { CheckCheck, Loader2, PenLine, RefreshCw, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Action row under the reply editor: draft controls on the left, send buttons on the right. */
export function ReplyActions({
  regenerating,
  regenerateLabel,
  regenerateDisabled,
  onRegenerate,
  showUseDraft,
  onUseDraft,
  onWriteManually,
  draftToggleDisabled,
  writeManuallyDisabled,
  sending,
  sendDisabled,
  onSend,
  onSendAndResolve,
}: {
  regenerating: boolean;
  regenerateLabel: string;
  regenerateDisabled: boolean;
  onRegenerate: () => void;
  /** True in manual mode while a draft exists: offer to switch back to it. */
  showUseDraft: boolean;
  onUseDraft: () => void;
  onWriteManually: () => void;
  draftToggleDisabled: boolean;
  writeManuallyDisabled: boolean;
  sending: boolean;
  sendDisabled: boolean;
  onSend: () => void;
  onSendAndResolve: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRegenerate}
          disabled={regenerateDisabled}
        >
          <RefreshCw className={regenerating ? "animate-spin" : undefined} aria-hidden />
          {regenerateLabel}
        </Button>
        {showUseDraft ? (
          <Button type="button" variant="ghost" size="sm" onClick={onUseDraft} disabled={draftToggleDisabled}>
            <Sparkles aria-hidden />
            Use AI draft
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onWriteManually}
            disabled={draftToggleDisabled || writeManuallyDisabled}
          >
            <PenLine aria-hidden />
            Write manually
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <Button type="button" variant="outline" onClick={onSendAndResolve} disabled={sendDisabled}>
          <CheckCheck aria-hidden />
          Send &amp; resolve
        </Button>
        <Button type="button" onClick={onSend} disabled={sendDisabled}>
          {sending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
          {sending ? "Sending…" : "Send reply"}
        </Button>
      </div>
    </div>
  );
}
