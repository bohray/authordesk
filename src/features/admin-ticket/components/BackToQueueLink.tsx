import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/Button";
import { routes } from "@/constants/routes";

/** "← Queue" link above the ticket, shared by the loaded view and its error states. */
export function BackToQueueLink() {
  return (
    <Link
      href={routes.admin.tickets}
      className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2" })}
    >
      <ArrowLeft aria-hidden />
      Queue
    </Link>
  );
}
