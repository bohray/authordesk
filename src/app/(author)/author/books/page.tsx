import type { Metadata } from "next";
import { BooksOverview } from "@/features/books/components/BooksOverview";

export const metadata: Metadata = { title: "My Books" };

export default function MyBooksPage() {
  return <BooksOverview />;
}
