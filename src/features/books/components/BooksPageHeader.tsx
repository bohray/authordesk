import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/Button";
import { PageHeader } from "@/components/common/PageHeader";
import { routes } from "@/constants/routes";

/** Shared by the page and its `loading.tsx`, so the header never shifts when data arrives. */
export function BooksPageHeader() {
  return (
    <PageHeader
      title="My Books"
      description="Sales, royalties and production status for every title you publish with us."
      actions={
        <Link href={routes.author.newTicket()} className={buttonVariants({ variant: "outline" })}>
          <Plus aria-hidden />
          Ask a question
        </Link>
      }
    />
  );
}
