"use client";

import { useMemo } from "react";
import Link from "next/link";
import { BookMarked } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { ROUTES } from "@/constants/routes";
import { MESSAGES } from "@/constants/messages";
import { plural } from "@/lib/format";
import { useMyBooks } from "@/features/books/hooks/use-my-books";
import { BooksPageHeader } from "@/features/books/components/books-page-header";
import { BooksSkeleton } from "@/features/books/components/books-skeleton";
import { RoyaltySummary } from "@/features/books/components/royalty-summary";
import { BookCards, BooksTable, type NotesByBook } from "@/features/books/components/books-list";
import { getRoyaltyNotes } from "@/features/books/utils/royalty";
import type { MyBooksDTO } from "@/shared/types/dto";

function BooksContent({ data }: { data: MyBooksDTO }) {
  // Table (desktop) and cards (mobile) are both rendered and toggled with CSS, so notes are
  // computed once per book here instead of twice per render in each list.
  const notes: NotesByBook = useMemo(
    () => new Map(data.books.map((b) => [b.id, getRoyaltyNotes(b, data.payoutThreshold)])),
    [data.books, data.payoutThreshold],
  );

  if (data.books.length === 0) {
    return (
      <EmptyState
        icon={BookMarked}
        title={MESSAGES.books.emptyTitle}
        description={MESSAGES.books.emptyBody}
        action={
          <Link href={ROUTES.author.newTicket()} className={buttonVariants({ variant: "outline" })}>
            Contact support
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <RoyaltySummary data={data} />
      <section aria-labelledby="books-heading" className="space-y-3">
        <h2 id="books-heading" className="text-sm font-medium text-muted-foreground">
          {plural(data.books.length, "book")}
        </h2>
        <BooksTable books={data.books} notes={notes} />
        <BookCards books={data.books} notes={notes} />
      </section>
    </div>
  );
}

export function BooksOverview() {
  const { data, isPending, isError, error, refetch, isRefetching } = useMyBooks();

  return (
    <>
      <BooksPageHeader />
      {isPending ? (
        <BooksSkeleton />
      ) : isError ? (
        <ErrorState
          title="Couldn't load your books"
          error={error}
          onRetry={() => refetch()}
          isRetrying={isRefetching}
        />
      ) : (
        <BooksContent data={data} />
      )}
    </>
  );
}
