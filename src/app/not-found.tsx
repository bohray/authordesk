import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { buttonVariants } from "@/components/ui/Button";
import { routes } from "@/constants/routes";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <FileQuestion className="size-10 text-muted-foreground" aria-hidden />
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          The page you were looking for doesn&apos;t exist or has moved.
        </p>
      </div>
      <Link href={routes.home} className={buttonVariants({ variant: "outline" })}>
        Back to AuthorDesk
      </Link>
    </main>
  );
}
