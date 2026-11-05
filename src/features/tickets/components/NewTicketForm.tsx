"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Skeleton } from "@/components/ui/Skeleton";
import { FormField, describedBy } from "@/components/forms/FormField";
import { SelectField, type SelectOption } from "@/components/forms/SelectField";
import { ErrorState } from "@/components/common/ErrorState";
import { toneText } from "@/components/common/tones";
import { routes } from "@/constants/routes";
import { uiMessages } from "@/constants/messages";
import { descriptionMax, maxAttachmentBytes, subjectMax } from "@/constants/ui";
import { formatBookStatus, formatBytes, generalBookLabel } from "@/lib/format";
import { getErrorMessage, getFieldErrors } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import { useBookOptions, useCreateTicket } from "@/features/tickets/hooks/useAuthorTickets";
import { NewTicketPageHeader } from "@/features/tickets/components/TicketsPageHeader";
import { TicketFormSkeleton } from "@/features/tickets/components/TicketSkeletons";
import { TicketTips } from "@/features/tickets/components/TicketTips";
import { generalBookOption } from "@/shared/constants/ticket";
import { createTicketSchema } from "@/shared/schemas/ticket.schema";
import type { BookDTO } from "@/shared/types/dto";

/** Same rules as the API, plus a friendlier message when no book is chosen yet. */
const formSchema = createTicketSchema.extend({
  bookId: z
    .string()
    .min(1, "Choose the book this is about, or General / Account Level")
    .pipe(createTicketSchema.shape.bookId),
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
const FilePicker = dynamic(
  () => import("@/components/forms/FilePicker").then((m) => m.FilePicker),
  {
    loading: () => (
      <div className="space-y-1.5" aria-hidden>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-3 w-56" />
      </div>
    ),
  },
);

function bookOptions(books: BookDTO[]): SelectOption[] {
  return [
    ...books.map((b) => ({
      value: b.id,
      label: b.isPublished ? b.title : `${b.title} (${formatBookStatus(b.status)})`,
    })),
    { value: generalBookOption, label: generalBookLabel },
  ];
}

function TicketForm({ books, initialBookId }: { books: BookDTO[]; initialBookId: string }) {
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
  const descLen = description.trim().length;

  const onSubmit = handleSubmit(async (values) => {
    try {
      const ticket = await createTicket.mutateAsync(values);
      toast.success(`Ticket ${ticket.ticketNumber} submitted`, {
        description: uiMessages.tickets.created,
      });
      router.push(routes.author.ticket(ticket.id));
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      let mapped = false;
      for (const f of formFieldNames) {
        const key = Object.keys(fieldErrors).find((k) => k === f || k.startsWith(`${f}.`));
        if (key) {
          setError(f, { message: fieldErrors[key] });
          mapped = true;
        }
      }
      toast.error(mapped ? "Please fix the highlighted fields." : getErrorMessage(err));
    }
  });

  const pending = createTicket.isPending || createTicket.isSuccess;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormField
        id="bookId"
        label="Which book is this about?"
        required
        error={errors.bookId?.message}
        hint="Choose General / Account Level for questions about your account, contract or payments overall."
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
              placeholder="Select a book"
              invalid={!!errors.bookId}
              ariaDescribedBy={describedBy("bookId", { error: errors.bookId?.message, hint: true })}
              className="h-9"
            />
          )}
        />
      </FormField>

      <FormField id="subject" label="Subject" required error={errors.subject?.message}>
        <Input
          id="subject"
          maxLength={subjectMax}
          placeholder="e.g. Q2 royalty payout not received"
          aria-invalid={!!errors.subject || undefined}
          aria-describedby={describedBy("subject", { error: errors.subject?.message })}
          className="h-9"
          {...register("subject")}
        />
      </FormField>

      <FormField
        id="description"
        label="Describe the issue"
        required
        error={errors.description?.message}
        hint={`Include the book title, dates and any order numbers. Minimum ${descriptionMin} characters.`}
        aside={
          <span
            className={cn(
              "text-xs tabular-nums",
              descLen > 0 && descLen < descriptionMin ? toneText.warn : "text-muted-foreground",
              descLen > descriptionMax && "text-destructive",
            )}
            aria-live="polite"
          >
            {descLen < descriptionMin && descLen > 0
              ? `${descriptionMin - descLen} more characters needed`
              : `${descLen.toLocaleString("en-IN")} / ${descriptionMax.toLocaleString("en-IN")}`}
          </span>
        }
      >
        <Textarea
          id="description"
          rows={7}
          maxLength={descriptionMax}
          className="min-h-36"
          placeholder="What happened, what you expected, and anything you've already tried."
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
        <Button type="submit" disabled={pending} className="h-9 px-4">
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
          {pending ? "Submitting…" : "Submit ticket"}
        </Button>
      </div>
    </form>
  );
}

export function NewTicketForm() {
  const searchParams = useSearchParams();
  const { data, isPending, isError, error, refetch, isRefetching } = useBookOptions();

  const requested = searchParams.get("bookId");
  const books = useMemo(() => data?.books ?? [], [data]);
  const initialBookId =
    requested && (requested === generalBookOption || books.some((b) => b.id === requested))
      ? requested
      : "";

  return (
    <>
      <NewTicketPageHeader />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardContent>
            {isPending ? (
              <div aria-busy="true">
                <span className="sr-only">Loading your books…</span>
                <TicketFormSkeleton />
              </div>
            ) : isError ? (
              <ErrorState
                title="Couldn't load your books"
                error={error}
                onRetry={() => refetch()}
                isRetrying={isRefetching}
              />
            ) : (
              <TicketForm key={initialBookId} books={books} initialBookId={initialBookId} />
            )}
          </CardContent>
        </Card>
        <aside className="space-y-4">
          <TicketTips />
        </aside>
      </div>
    </>
  );
}
