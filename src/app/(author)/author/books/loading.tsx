import { BooksPageHeader } from "@/features/books/components/books-page-header";
import { BooksSkeleton } from "@/features/books/components/books-skeleton";

export default function Loading() {
  return (
    <>
      <BooksPageHeader />
      <BooksSkeleton />
    </>
  );
}
