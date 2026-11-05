"use client";

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
import { getErrorMessage } from "@/lib/apiClient";
import { useReplyToTicket } from "@/features/tickets/hooks/useAuthorTickets";
import { createMessageSchema, type CreateMessageInput } from "@/shared/schemas/ticket.schema";
import type { TicketStatus } from "@/shared/constants/ticket";

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

  const onSubmit = handleSubmit(async ({ body }) => {
    try {
      await reply.mutateAsync(body);
      reset({ body: "" });
      toast.success(status === "RESOLVED" ? "Reply sent, ticket reopened" : uiMessages.tickets.replySent);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-2">
      <Label htmlFor="reply-body">Add a reply</Label>
      {status === "RESOLVED" && (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {uiMessages.tickets.resolvedReply}
        </p>
      )}
      <Textarea
        id="reply-body"
        rows={4}
        maxLength={messageMax}
        placeholder="Write a follow-up or answer a question from our team…"
        aria-invalid={!!errors.body || undefined}
        aria-describedby={errors.body ? "reply-body-error" : undefined}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void onSubmit();
        }}
        {...register("body")}
      />
      {errors.body && (
        <p id="reply-body-error" role="alert" className="text-xs text-destructive">
          {errors.body.message}
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="hidden text-xs text-muted-foreground sm:inline">Ctrl/⌘ + Enter to send</span>
        <Button type="submit" disabled={reply.isPending} className="ml-auto">
          {reply.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
          {reply.isPending ? "Sending…" : "Send reply"}
        </Button>
      </div>
    </form>
  );
}
