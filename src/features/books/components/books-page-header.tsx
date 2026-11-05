import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { ROUTES } from "@/constants/routes";

/** Shared by the page and its `loading.tsx`, so the header never shifts when data arrives. */
export function BooksPageHeader() {
  return (
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
}
