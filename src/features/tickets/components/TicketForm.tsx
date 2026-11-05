"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Skeleton } from "@/components/ui/Skeleton";
import { FormField, describedBy } from "@/components/forms/FormField";
import { SelectField, type SelectOption } from "@/components/forms/SelectField";
import { toneText } from "@/components/common/tones";
import { routes } from "@/constants/routes";
import { uiMessages } from "@/constants/messages";
import { descriptionMax, maxAttachmentBytes, subjectMax } from "@/constants/ui";
import { newTicketCopy, ticketFormControlClass } from "@/constants/tickets";
import { formatBookStatus, formatBytes, formatNumber, generalBookLabel } from "@/lib/format";
import { getErrorMessage, getFieldErrors } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import { useCreateTicket } from "@/features/tickets/hooks/useAuthorTickets";
import { generalBookOption } from "@/shared/constants/ticket";
import { createTicketSchema } from "@/shared/schemas/ticket.schema";
import type { BookDTO } from "@/shared/types/dto";

/** Same rules as the API, plus a friendlier message when no book is chosen yet. */
const formSchema = createTicketSchema.extend({
  bookId: z.string().min(1, newTicketCopy.bookRequired).pipe(createTicketSchema.shape.bookId),
});
type FormValues = z.input<typeof formSchema>;
type FormOutput = z.output<typeof formSchema>;
const formFieldNames = ["bookId", "subject", "description", "attachment"] as const;
/** Read from the shared schema so the live counter can't drift from server validation. */
const descriptionMin = createTicketSchema.shape.description.minLength ?? 0;

/**
 * The attachment picker is optional and below the fold, so it is split out of the initial
 * bundle. The placeholder matches its button + hint so nothing shifts when it loads.
 */
const FilePicker = dynamic(() => import("@/components/forms/FilePicker").then((m) => m.FilePicker), {
  loading: () => (
    <div className="space-y-1.5" aria-hidden>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-56" />
    </div>
  ),
});

function bookOptions(books: BookDTO[]): SelectOption[] {
  return [
    ...books.map((b) => ({
      value: b.id,
      label: b.isPublished ? b.title : `${b.title} (${formatBookStatus(b.status)})`,
    })),
    { value: generalBookOption, label: generalBookLabel },
  ];
}

/** Live character count; switches to "N more needed" until the server minimum is met. */
function DescriptionCounter({ length }: { length: number }) {
  const belowMin = length > 0 && length < descriptionMin;
  return (
    <span
      className={cn(
        "text-xs tabular-nums",
        belowMin ? toneText.warn : "text-muted-foreground",
        length > descriptionMax && "text-destructive",
      )}
      aria-live="polite"
    >
      {belowMin
        ? `${descriptionMin - length} more characters needed`
        : `${formatNumber(length)} / ${formatNumber(descriptionMax)}`}
    </span>
  );
}

/** The new-ticket form itself; `NewTicketForm` loads the books and picks the initial one. */
export function TicketForm({ books, initialBookId }: { books: BookDTO[]; initialBookId: string }) {
  const router = useRouter();
  const createTicket = useCreateTicket();
  const options = useMemo(() => bookOptions(books), [books]);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    defaultValues: { bookId: initialBookId, subject: "", description: "", attachment: undefined },
  });

  const description = useWatch({ control, name: "description" }) ?? "";
  const descriptionLength = description.trim().length;

  const handleCreate = handleSubmit(async (values) => {
    try {
      const ticket = await createTicket.mutateAsync(values);
      toast.success(newTicketCopy.submitted(ticket.ticketNumber), {
        description: uiMessages.tickets.created,
      });
      router.push(routes.author.ticket(ticket.id));
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      let mapped = false;
      for (const name of formFieldNames) {
        // Nested paths (e.g. "attachment.size") are shown on their top-level field.
        const path = Object.keys(fieldErrors).find((k) => k === name || k.startsWith(`${name}.`));
        if (path) {
          setError(name, { message: fieldErrors[path] });
          mapped = true;
        }
      }
      toast.error(mapped ? newTicketCopy.fixFields : getErrorMessage(err));
    }
  });

  // Stay disabled after success too: the redirect to the new ticket is still in flight.
  const pending = createTicket.isPending || createTicket.isSuccess;

  return (
    <form onSubmit={handleCreate} noValidate className="space-y-5">
      <FormField
        id="bookId"
        label="Which book is this about?"
        required
        error={errors.bookId?.message}
        hint={newTicketCopy.bookHint}
      >
        <Controller
          control={control}
          name="bookId"
          render={({ field }) => (
            <SelectField
              id="bookId"
              value={field.value || null}
              onValueChange={field.onChange}
              options={options}
              placeholder={newTicketCopy.bookPlaceholder}
              invalid={!!errors.bookId}
              ariaDescribedBy={describedBy("bookId", { error: errors.bookId?.message, hint: true })}
              className={ticketFormControlClass}
            />
          )}
        />
      </FormField>

      <FormField id="subject" label="Subject" required error={errors.subject?.message}>
        <Input
          id="subject"
          maxLength={subjectMax}
          placeholder={newTicketCopy.subjectPlaceholder}
          aria-invalid={!!errors.subject || undefined}
          aria-describedby={describedBy("subject", { error: errors.subject?.message })}
          className={ticketFormControlClass}
          {...register("subject")}
        />
      </FormField>

      <FormField
        id="description"
        label="Describe the issue"
        required
        error={errors.description?.message}
        hint={newTicketCopy.descriptionHint(descriptionMin)}
        aside={<DescriptionCounter length={descriptionLength} />}
      >
        <Textarea
          id="description"
          rows={7}
          maxLength={descriptionMax}
          className="min-h-36"
          placeholder={newTicketCopy.descriptionPlaceholder}
          aria-invalid={!!errors.description || undefined}
          aria-describedby={describedBy("description", {
            error: errors.description?.message,
            hint: true,
          })}
          {...register("description")}
        />
      </FormField>

      <FormField id="attachment" label="Attachment (optional)" error={errors.attachment?.message}>
        <Controller
          control={control}
          name="attachment"
          render={({ field }) => (
            <FilePicker
              id="attachment"
              value={field.value ?? null}
              onChange={(f) => field.onChange(f ?? undefined)}
              maxBytes={maxAttachmentBytes}
              disabled={pending}
              hint={`Max ${formatBytes(maxAttachmentBytes)}. ${uiMessages.tickets.attachmentNote}`}
            />
          )}
        />
      </FormField>

      <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
        <Link href={routes.author.tickets} className={buttonVariants({ variant: "ghost" })}>
          Cancel
        </Link>
        <Button type="submit" disabled={pending} className={cn(ticketFormControlClass, "px-4")}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
          {pending ? "Submitting…" : "Submit ticket"}
        </Button>
      </div>
    </form>
  );
}
