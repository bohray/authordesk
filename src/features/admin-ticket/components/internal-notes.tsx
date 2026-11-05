"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { EyeOff, Loader2, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RelativeTime } from "@/components/common/relative-time";
import { NOTE_CLASSES } from "@/components/common/tones";
import { cn } from "@/lib/utils";
import { MESSAGES } from "@/constants/messages";
import { MESSAGE_MAX } from "@/constants/ui";
import { useAddNote } from "@/features/admin-ticket/hooks/use-admin-ticket";
import { createNoteSchema, type CreateNoteInput } from "@/shared/schemas/ticket.schema";
import type { TicketNoteDTO } from "@/shared/types/dto";

export function InternalNotes({ ticketId, notes }: { ticketId: string; notes: TicketNoteDTO[] }) {
  const addNote = useAddNote(ticketId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateNoteInput>({
    resolver: zodResolver(createNoteSchema),
    defaultValues: { body: "" },
  });

  const onSubmit = handleSubmit(async ({ body }) => {
    try {
      await addNote.mutateAsync(body);
      reset({ body: "" });
    } catch {
      // toast handled in the mutation
    }
  });

  return (
    <section
      aria-labelledby="notes-heading"
      className={cn("space-y-3 rounded-xl border p-3", NOTE_CLASSES.panel)}
    >
      <div className="space-y-0.5">
        <h2 id="notes-heading" className="flex items-center gap-2 text-sm font-medium">
          <StickyNote className={cn("size-4", NOTE_CLASSES.icon)} aria-hidden />
          Internal notes
        </h2>
        <p className={cn("flex items-center gap-1 text-xs", NOTE_CLASSES.muted)}>
          <EyeOff className="size-3" aria-hidden />
          {MESSAGES.notes.label}
        </p>
      </div>

      {notes.length === 0 ? (
        <p className={cn("text-xs opacity-80", NOTE_CLASSES.muted)}>No notes yet. Leave context for teammates here.</p>
      ) : (
        <ol className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className={cn("rounded-lg px-3 py-2", NOTE_CLASSES.item)}>
              <div className={cn("flex flex-wrap items-center gap-x-2 text-xs", NOTE_CLASSES.muted)}>
                <span className={cn("font-medium", NOTE_CLASSES.strong)}>{n.adminName}</span>
                <RelativeTime date={n.createdAt} />
              </div>
              <p className="mt-0.5 text-sm break-words whitespace-pre-wrap">{n.body}</p>
            </li>
          ))}
        </ol>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-2">
        <Label htmlFor="note-body" className="sr-only">
          Add an internal note
        </Label>
        <Textarea
          id="note-body"
          rows={2}
          maxLength={MESSAGE_MAX}
          placeholder="Add a note for the team…"
          className={NOTE_CLASSES.control}
          aria-invalid={!!errors.body || undefined}
          aria-describedby={errors.body ? "note-body-error" : undefined}
          {...register("body")}
        />
        {errors.body && (
          <p id="note-body-error" role="alert" className="text-xs text-destructive">
            {errors.body.message}
          </p>
        )}
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            variant="outline"
            className={NOTE_CLASSES.control}
            disabled={addNote.isPending}
          >
            {addNote.isPending && <Loader2 className="animate-spin" aria-hidden />}
            Add note
          </Button>
        </div>
      </form>
    </section>
  );
}
