"use client";

import { useState } from "react";
import { AlertTriangle, Lock, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { LazyConfirmDialog } from "@/components/common/LazyConfirmDialog";
import { RelativeTime } from "@/components/common/RelativeTime";
import { aiRing, toneCallout, toneText } from "@/components/common/tones";
import { regenerateDraftDialog, replyComposerCopy, ticketUpdateMessages } from "@/constants/adminTicket";
import { uiMessages } from "@/constants/messages";
import { getErrorMessage } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import {
  useDraft,
  useRegenerateDraft,
  useSendReply,
  useUpdateTicket,
} from "@/features/admin-ticket/hooks/useAdminTicket";
import { DraftEditorSkeleton } from "@/features/admin-ticket/components/AdminTicketSkeletons";
import { ReplyActions } from "@/features/admin-ticket/components/ReplyActions";
import { ReplyEditor } from "@/features/admin-ticket/components/ReplyEditor";
import { createMessageSchema } from "@/shared/schemas/ticket.schema";
import type { TicketStatus } from "@/shared/constants/ticket";
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

function ClosedReplyNotice() {
  return (
    <Card size="sm">
      <CardContent>
        <Alert className="bg-muted/50">
          <Lock aria-hidden />
          <AlertDescription>{replyComposerCopy.closedNotice}</AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

/** Explains what sending does, plus when the draft was generated if the text came from it. */
function ReplyHint({
  fromDraft,
  status,
  generatedAt,
}: {
  fromDraft: boolean;
  status: TicketStatus;
  generatedAt: string | null | undefined;
}) {
  if (!fromDraft) {
    return status === "OPEN" ? replyComposerCopy.hintOpenTicket : replyComposerCopy.hintDefault;
  }
  return (
    <>
      {replyComposerCopy.hintFromDraft}
      {generatedAt && (
        <>
          {" "}
          Drafted <RelativeTime date={generatedAt} />.
        </>
      )}
    </>
  );
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
    ? getErrorMessage(draftQuery.error, uiMessages.draft.unavailable)
    : draft?.status === "UNAVAILABLE"
      ? (draft.message ?? uiMessages.draft.unavailable)
      : null;

  const loadingDraft = draftQuery.isPending && draftQuery.fetchStatus === "fetching";
  const waitingForDraft = loadingDraft && !manual;
  const isEdited = composer.fromDraft && !!draft?.content && composer.text !== draft.content;
  const hasUnsavedManualText = !composer.fromDraft && !!composer.text.trim();
  const busy = send.isPending || update.isPending;
  const sendDisabled = busy || waitingForDraft || !composer.text.trim();

  const regenerateLabel = regenerate.isPending
    ? "Regenerating…"
    : unavailableMessage
      ? "Try AI again"
      : "Regenerate";

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

  // Regenerating overwrites the editor, so ask first if it holds the admin's own words.
  const handleRegenerate = () => {
    if (isEdited || hasUnsavedManualText) setConfirmRegenerate(true);
    else doRegenerate();
  };

  const handleUseDraft = () => {
    if (draft) applyDraft(draft);
  };

  const writeManually = () => {
    setManual(true);
    setError(null);
    setComposer({ text: "", fromDraft: false, seededKey: key });
  };

  const handleTextChange = (text: string) => {
    setError(null);
    setComposer((c) => ({ ...c, text, fromDraft: c.fromDraft && text.trim() !== "" }));
  };

  const submit = async ({ resolve }: { resolve: boolean }) => {
    const parsed = createMessageSchema.safeParse({ body: composer.text });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? replyComposerCopy.emptyError);
      return;
    }
    setError(null);
    try {
      await send.mutateAsync({ body: parsed.data.body, aiAssisted: composer.fromDraft });
      // seededKey stays on the current draft so the seeding check doesn't refill the editor.
      setComposer({ text: "", fromDraft: false, seededKey: key });
      setManual(true);
      if (resolve) {
        update.mutate({ patch: { status: "RESOLVED" }, successMessage: ticketUpdateMessages.resolved });
      }
    } catch {
      // toast handled in the mutation
    }
  };

  const sendReply = () => void submit({ resolve: false });
  const sendAndResolve = () => void submit({ resolve: true });

  if (closed) return <ClosedReplyNotice />;

  return (
    <Card size="sm" className={aiRing}>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className={cn("size-4", toneText.ai)} aria-hidden />
          Reply to author
        </CardTitle>
        <div className="flex flex-wrap items-center gap-1.5">
          {composer.fromDraft && draft?.status === "READY" && (
            <Badge
              variant="outline"
              className={toneCallout.aiBadge}
              title={draft.model ? `Model: ${draft.model}` : undefined}
            >
              {draft.cached ? replyComposerCopy.badgeCached : replyComposerCopy.badgeFresh}
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
          <Alert className={toneCallout.warn}>
            <AlertTriangle aria-hidden />
            <AlertTitle>{replyComposerCopy.unavailableTitle}</AlertTitle>
            <AlertDescription className={toneCallout.warnBody}>
              {unavailableMessage} {replyComposerCopy.unavailableSuffix}
            </AlertDescription>
          </Alert>
        )}

        {waitingForDraft ? (
          <DraftEditorSkeleton message={uiMessages.draft.loading} />
        ) : (
          <ReplyEditor
            value={composer.text}
            disabled={busy || regenerate.isPending}
            placeholder={
              unavailableMessage || manual
                ? replyComposerCopy.manualPlaceholder
                : replyComposerCopy.draftPlaceholder
            }
            error={error}
            hint={
              <ReplyHint
                fromDraft={composer.fromDraft}
                status={ticket.status}
                generatedAt={draft?.generatedAt}
              />
            }
            onChange={handleTextChange}
            onSubmitShortcut={sendReply}
          />
        )}

        <ReplyActions
          regenerating={regenerate.isPending}
          regenerateLabel={regenerateLabel}
          regenerateDisabled={regenerate.isPending || loadingDraft || busy}
          onRegenerate={handleRegenerate}
          showUseDraft={manual && !!key}
          onUseDraft={handleUseDraft}
          onWriteManually={writeManually}
          draftToggleDisabled={busy}
          writeManuallyDisabled={manual && !composer.text}
          sending={send.isPending}
          sendDisabled={sendDisabled}
          onSend={sendReply}
          onSendAndResolve={sendAndResolve}
        />
      </CardContent>

      <LazyConfirmDialog
        open={confirmRegenerate}
        onOpenChange={setConfirmRegenerate}
        title={regenerateDraftDialog.title}
        description={regenerateDraftDialog.description}
        confirmLabel={regenerateDraftDialog.confirmLabel}
        onConfirm={doRegenerate}
      />
    </Card>
  );
}
