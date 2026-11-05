"use client";

import Link from "next/link";
import { BookMarked, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { CardsSkeleton, ListSkeleton } from "@/components/common/loading-state";
import { ROUTES } from "@/constants/routes";
import { MESSAGES } from "@/constants/messages";
import { useMyBooks } from "@/features/books/hooks/use-my-books";
import { RoyaltySummary } from "@/features/books/components/royalty-summary";
import { BookCards, BooksTable } from "@/features/books/components/books-list";

export function BooksOverview() {
  const { data, isPending, isError, error, refetch, isRefetching } = useMyBooks();

  const header = (
    <PageHeader
      title="My Books"
      description="Sales, royalties and production status for every title you publish with us."
      actions={
        <Link href={ROUTES.author.newTicket()} className={buttonVariants({ variant: "outline" })}>
          <Plus aria-hidden />
          Ask a question
        </Link>
      }
    />
  );

  if (isPending) {
    return (
      <>
        {header}
        <CardsSkeleton count={5} className="mb-6" />
        <ListSkeleton rows={4} />
      </>
    );
  }

  if (isError) {
    return (
      <>
        {header}
        <ErrorState
          title="Couldn't load your books"
          error={error}
          onRetry={() => refetch()}
          isRetrying={isRefetching}
        />
      </>
    );
  }

  return (
    <>
      {header}
      {data.books.length === 0 ? (
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
      ) : (
        <div className="space-y-6">
          <RoyaltySummary data={data} />
          <section aria-labelledby="books-heading" className="space-y-3">
            <h2 id="books-heading" className="text-sm font-medium text-muted-foreground">
              {data.books.length} book{data.books.length === 1 ? "" : "s"}
            </h2>
            <BooksTable books={data.books} threshold={data.payoutThreshold} />
            <BookCards books={data.books} threshold={data.payoutThreshold} />
          </section>
        </div>
      )}
    </>
  );
}
