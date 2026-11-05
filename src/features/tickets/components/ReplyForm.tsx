"use client";

import type { KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Info, Loader2, Lock, Send } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";
import { uiMessages } from "@/constants/messages";
import { messageMax } from "@/constants/ui";
import { replyCopy } from "@/constants/tickets";
import { getErrorMessage } from "@/lib/apiClient";
import { useReplyToTicket } from "@/features/tickets/hooks/useAuthorTickets";
import { createMessageSchema, type CreateMessageInput } from "@/shared/schemas/ticket.schema";
import type { TicketStatus } from "@/shared/constants/ticket";

const replyFieldId = "reply-body";
const replyErrorId = `${replyFieldId}-error`;

export function ReplyForm({ ticketId, status }: { ticketId: string; status: TicketStatus }) {
  const reply = useReplyToTicket(ticketId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateMessageInput>({
    resolver: zodResolver(createMessageSchema),
    defaultValues: { body: "" },
  });

  if (status === "CLOSED") {
    return (
      <Alert className="bg-muted/50">
        <Lock aria-hidden />
        <AlertDescription>{uiMessages.tickets.closedReply}</AlertDescription>
      </Alert>
    );
  }

  const isResolved = status === "RESOLVED";

  const handleReply = handleSubmit(async ({ body }) => {
    try {
      await reply.mutateAsync(body);
      reset({ body: "" });
      toast.success(isResolved ? replyCopy.sentAndReopened : uiMessages.tickets.replySent);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  });

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void handleReply();
  };

  return (
    <form onSubmit={handleReply} noValidate className="space-y-2">
      <Label htmlFor={replyFieldId}>Add a reply</Label>
      {isResolved && (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {uiMessages.tickets.resolvedReply}
        </p>
      )}
      <Textarea
        id={replyFieldId}
        rows={4}
        maxLength={messageMax}
        placeholder={replyCopy.placeholder}
        aria-invalid={!!errors.body || undefined}
        aria-describedby={errors.body ? replyErrorId : undefined}
        onKeyDown={handleKeyDown}
        {...register("body")}
      />
      {errors.body && (
        <p id={replyErrorId} role="alert" className="text-xs text-destructive">
          {errors.body.message}
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="hidden text-xs text-muted-foreground sm:inline">{replyCopy.shortcutHint}</span>
        <Button type="submit" disabled={reply.isPending} className="ml-auto">
          {reply.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
          {reply.isPending ? "Sending…" : "Send reply"}
        </Button>
      </div>
    </form>
  );
}
