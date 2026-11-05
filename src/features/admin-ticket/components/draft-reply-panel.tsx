"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCheck,
  Loader2,
  Lock,
  PenLine,
  RefreshCw,
  Send,
  Sparkles,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LazyConfirmDialog } from "@/components/common/lazy-confirm-dialog";
import { RelativeTime } from "@/components/common/relative-time";
import { AI_RING, TONE_CALLOUT, TONE_TEXT } from "@/components/common/tones";
import { MESSAGES } from "@/constants/messages";
import { MESSAGE_MAX } from "@/constants/ui";
import { getErrorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  useDraft,
  useRegenerateDraft,
  useSendReply,
  useUpdateTicket,
} from "@/features/admin-ticket/hooks/use-admin-ticket";
import { DraftEditorSkeleton } from "@/features/admin-ticket/components/admin-ticket-skeletons";
import { createMessageSchema } from "@/shared/schemas/ticket.schema";
import type { AdminTicketDetailDTO, DraftDTO } from "@/shared/types/dto";

interface Composer {
  text: string;
  /** True while the text originated from an AI draft (sent as `aiAssisted`). */
  fromDraft: boolean;
  /** Which draft version has already been placed in the editor. */
  seededKey: string | null;
}

function draftKey(d: DraftDTO | undefined): string | null {
  if (!d || d.status !== "READY" || !d.content) return null;
  return `${d.generatedAt ?? ""}|${d.content.length}`;
}

export function DraftReplyPanel({ ticket }: { ticket: AdminTicketDetailDTO }) {
  const closed = ticket.status === "CLOSED";
  const draftQuery = useDraft(ticket.id, !closed);
  const regenerate = useRegenerateDraft(ticket.id);
  const send = useSendReply(ticket.id);
  const update = useUpdateTicket(ticket.id);

  const [composer, setComposer] = useState<Composer>({ text: "", fromDraft: false, seededKey: null });
  const [manual, setManual] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const draft = draftQuery.data;
  const key = draftKey(draft);

  // Seed the editor when a draft arrives, unless the admin chose manual or is already typing.
  if (key && draft?.content && !manual && composer.seededKey !== key && composer.text.trim() === "") {
    setComposer({ text: draft.content, fromDraft: true, seededKey: key });
  }

  const unavailableMessage = draftQuery.isError
    ? getErrorMessage(draftQuery.error, MESSAGES.draft.unavailable)
    : draft?.status === "UNAVAILABLE"
      ? (draft.message ?? MESSAGES.draft.unavailable)
      : null;

  const loadingDraft = draftQuery.isPending && draftQuery.fetchStatus === "fetching";
  const isEdited = composer.fromDraft && !!draft?.content && composer.text !== draft.content;
  const busy = send.isPending || update.isPending;

  const applyDraft = (d: DraftDTO) => {
    const k = draftKey(d);
    if (k && d.content) {
      setManual(false);
      setComposer({ text: d.content, fromDraft: true, seededKey: k });
    }
  };

  const doRegenerate = () => {
    setConfirmRegenerate(false);
    regenerate.mutate(undefined, { onSuccess: applyDraft });
  };

  const onRegenerate = () => {
    if (isEdited || (!composer.fromDraft && composer.text.trim())) setConfirmRegenerate(true);
    else doRegenerate();
  };

  const writeManually = () => {
    setManual(true);
    setError(null);
    setComposer({ text: "", fromDraft: false, seededKey: key });
  };

  const submit = async (resolve: boolean) => {
    const parsed = createMessageSchema.safeParse({ body: composer.text });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Message cannot be empty");
      return;
    }
    setError(null);
    try {
      await send.mutateAsync({ body: parsed.data.body, aiAssisted: composer.fromDraft });
      setComposer({ text: "", fromDraft: false, seededKey: key });
      setManual(true);
      if (resolve) {
        update.mutate({ patch: { status: "RESOLVED" }, successMessage: "Ticket marked resolved" });
      }
    } catch {
      // toast handled in the mutation
    }
  };

  if (closed) {
    return (
      <Card size="sm">
        <CardContent>
          <Alert className="bg-muted/50">
            <Lock aria-hidden />
            <AlertDescription>
              This ticket is closed. Reopen it (set status to Open or In Progress) to reply.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card size="sm" className={AI_RING}>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className={cn("size-4", TONE_TEXT.ai)} aria-hidden />
          Reply to author
        </CardTitle>
        <div className="flex flex-wrap items-center gap-1.5">
          {composer.fromDraft && draft?.status === "READY" && (
            <Badge
              variant="outline"
              className={TONE_CALLOUT.aiBadge}
              title={draft.model ? `Model: ${draft.model}` : undefined}
            >
              {draft.cached ? "AI draft · cached" : "AI draft · freshly generated"}
            </Badge>
          )}
          {isEdited && (
            <Badge variant="outline" className="text-muted-foreground">
              Edited
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {unavailableMessage && (
          <Alert className={TONE_CALLOUT.warn}>
            <AlertTriangle aria-hidden />
            <AlertTitle>AI draft unavailable</AlertTitle>
            <AlertDescription className={TONE_CALLOUT.warnBody}>
              {unavailableMessage} You can write a manual reply below.
            </AlertDescription>
          </Alert>
        )}

        {loadingDraft && !manual ? (
          <DraftEditorSkeleton message={MESSAGES.draft.loading} />
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="admin-reply" className="sr-only">
              Reply message
            </Label>
            <Textarea
              id="admin-reply"
              rows={8}
              maxLength={MESSAGE_MAX}
              className="min-h-40"
              value={composer.text}
              disabled={busy || regenerate.isPending}
              placeholder={
                unavailableMessage || manual
                  ? "Write your reply to the author…"
                  : "The AI draft will appear here."
              }
              aria-invalid={!!error || undefined}
              aria-describedby={error ? "admin-reply-error" : "admin-reply-hint"}
              onChange={(e) => {
                const text = e.target.value;
                setError(null);
                setComposer((c) => ({ ...c, text, fromDraft: c.fromDraft && text.trim() !== "" }));
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void submit(false);
              }}
            />
            {error ? (
              <p id="admin-reply-error" role="alert" className="text-xs text-destructive">
                {error}
              </p>
            ) : (
              <p id="admin-reply-hint" className="text-xs text-muted-foreground">
                {composer.fromDraft
                  ? "Review and edit before sending. Check facts like dates and amounts against the book card."
                  : ticket.status === "OPEN"
                    ? "Sending a reply moves the ticket to In Progress."
                    : "The author sees this reply immediately."}
                {draft?.generatedAt && composer.fromDraft && (
                  <>
                    {" "}
                    Drafted <RelativeTime date={draft.generatedAt} />.
                  </>
                )}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRegenerate}
              disabled={regenerate.isPending || loadingDraft || busy}
            >
              <RefreshCw className={regenerate.isPending ? "animate-spin" : undefined} aria-hidden />
              {regenerate.isPending ? "Regenerating…" : unavailableMessage ? "Try AI again" : "Regenerate"}
            </Button>
            {manual && key ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => draft && applyDraft(draft)}
                disabled={busy}
              >
                <Sparkles aria-hidden />
                Use AI draft
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={writeManually}
                disabled={busy || (manual && !composer.text)}
              >
                <PenLine aria-hidden />
                Write manually
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => void submit(true)}
              disabled={busy || (loadingDraft && !manual) || !composer.text.trim()}
            >
              <CheckCheck aria-hidden />
              Send &amp; resolve
            </Button>
            <Button
              type="button"
              onClick={() => void submit(false)}
              disabled={busy || (loadingDraft && !manual) || !composer.text.trim()}
            >
              {send.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
              {send.isPending ? "Sending…" : "Send reply"}
            </Button>
          </div>
        </div>
      </CardContent>

      <LazyConfirmDialog
        open={confirmRegenerate}
        onOpenChange={setConfirmRegenerate}
        title="Replace your edits?"
        description="Regenerating replaces the text in the editor with a new AI draft."
        confirmLabel="Regenerate"
        onConfirm={doRegenerate}
      />
    </Card>
  );
}
