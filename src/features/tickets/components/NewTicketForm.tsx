"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { ErrorState } from "@/components/common/ErrorState";
import { newTicketLayoutClass } from "@/constants/tickets";
import { useBookOptions } from "@/features/tickets/hooks/useAuthorTickets";
import { NewTicketPageHeader } from "@/features/tickets/components/TicketsPageHeader";
import { TicketForm } from "@/features/tickets/components/TicketForm";
import { TicketFormSkeleton } from "@/features/tickets/components/TicketSkeletons";
import { TicketTips } from "@/features/tickets/components/TicketTips";
import { generalBookOption } from "@/shared/constants/ticket";

export function NewTicketForm() {
  const searchParams = useSearchParams();
  const { data, isPending, isError, error, refetch, isRefetching } = useBookOptions();

  // Preselect the book from `?bookId` (the "Get help" links), but only if it is really one of theirs.
  const requested = searchParams.get("bookId");
  const books = useMemo(() => data?.books ?? [], [data]);
  const initialBookId =
    requested && (requested === generalBookOption || books.some((b) => b.id === requested)) ? requested : "";

  return (
    <>
      <NewTicketPageHeader />
      <div className={newTicketLayoutClass}>
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
