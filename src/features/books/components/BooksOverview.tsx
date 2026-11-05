"use client";

import { useMemo } from "react";
import Link from "next/link";
import { BookMarked } from "lucide-react";
import { buttonVariants } from "@/components/ui/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { routes } from "@/constants/routes";
import { uiMessages } from "@/constants/messages";
import { plural } from "@/lib/format";
import { useMyBooks } from "@/features/books/hooks/useMyBooks";
import { BooksPageHeader } from "@/features/books/components/BooksPageHeader";
import { BooksSkeleton } from "@/features/books/components/BooksSkeleton";
import { RoyaltySummary } from "@/features/books/components/RoyaltySummary";
import { BookCards, BooksTable, type NotesByBook } from "@/features/books/components/BooksList";
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
        title={uiMessages.books.emptyTitle}
        description={uiMessages.books.emptyBody}
        action={
          <Link href={routes.author.newTicket()} className={buttonVariants({ variant: "outline" })}>
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
