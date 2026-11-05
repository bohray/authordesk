"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Lightbulb, Loader2, Send } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { FormField, describedBy } from "@/components/forms/form-field";
import { SelectField, type SelectOption } from "@/components/forms/select-field";
import { FilePicker } from "@/components/forms/file-picker";
import { ErrorState } from "@/components/common/error-state";
import { PageHeader } from "@/components/common/page-header";
import { ROUTES } from "@/constants/routes";
import { MESSAGES } from "@/constants/messages";
import { DESCRIPTION_MAX, MAX_ATTACHMENT_BYTES, SUBJECT_MAX } from "@/constants/ui";
import { formatBookStatus } from "@/lib/format";
import { getErrorMessage, getFieldErrors } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useBookOptions, useCreateTicket } from "@/features/tickets/hooks/use-author-tickets";
import { GENERAL_BOOK_OPTION } from "@/shared/constants/ticket";
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
const FIELDS = ["bookId", "subject", "description", "attachment"] as const;

function bookOptions(books: BookDTO[]): SelectOption[] {
  return [
    ...books.map((b) => ({
      value: b.id,
      label: b.isPublished ? b.title : `${b.title} (${formatBookStatus(b.status)})`,
    })),
    { value: GENERAL_BOOK_OPTION, label: "General / Account Level" },
  ];
}

function Tips() {
  return (
    <Card size="sm" className="bg-muted/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Lightbulb className="size-4 text-amber-600" aria-hidden />
          Tips for a faster answer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">
          <li>Pick the book your question is about so we can see its sales and royalty data.</li>
          <li>Include relevant dates, e.g. when you expected a payout or placed an order.</li>
          <li>Add order numbers, platform names (Amazon, Flipkart) or links where it applies.</li>
          <li>For printing issues, describe the defect and how many copies are affected.</li>
        </ul>
      </CardContent>
    </Card>
  );
}

function TicketForm({ books, initialBookId }: { books: BookDTO[]; initialBookId: string }) {
  const router = useRouter();
  const createTicket = useCreateTicket();
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
        description: MESSAGES.tickets.created,
      });
      router.push(ROUTES.author.ticket(ticket.id));
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      let mapped = false;
      for (const f of FIELDS) {
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
              options={bookOptions(books)}
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
          maxLength={SUBJECT_MAX}
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
        hint="Include the book title, dates and any order numbers. Minimum 20 characters."
        aside={
          <span
            className={cn(
              "text-xs tabular-nums",
              descLen > 0 && descLen < 20 ? "text-amber-700" : "text-muted-foreground",
              descLen > DESCRIPTION_MAX && "text-destructive",
            )}
            aria-live="polite"
          >
            {descLen < 20 && descLen > 0
              ? `${20 - descLen} more characters needed`
              : `${descLen.toLocaleString("en-IN")} / ${DESCRIPTION_MAX.toLocaleString("en-IN")}`}
          </span>
        }
      >
        <Textarea
          id="description"
          rows={7}
          maxLength={DESCRIPTION_MAX}
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
              maxBytes={MAX_ATTACHMENT_BYTES}
              disabled={pending}
              hint={`Max 10 MB. ${MESSAGES.tickets.attachmentNote}`}
            />
          )}
        />
      </FormField>

      <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
        <Link href={ROUTES.author.tickets} className={buttonVariants({ variant: "ghost" })}>
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
  const books = data?.books ?? [];
  const initialBookId =
    requested && (requested === GENERAL_BOOK_OPTION || books.some((b) => b.id === requested))
      ? requested
      : "";

  return (
    <>
      <PageHeader
        title="New Ticket"
        description="Tell us what you need help with. Our support team replies right here."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardContent>
            {isPending ? (
              <div className="space-y-4" aria-busy="true">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-36 w-full" />
                <Skeleton className="h-8 w-32" />
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
          <Tips />
        </aside>
      </div>
    </>
  );
}
