import { BooksPageHeader } from "@/features/books/components/BooksPageHeader";
import { BooksSkeleton } from "@/features/books/components/BooksSkeleton";

export default function Loading() {
  return (
    <>
      <BooksPageHeader />
      <BooksSkeleton />
    </>
  );
}
