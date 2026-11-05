import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BookStatusBadge } from "@/components/common/book-status-badge";
import { Currency } from "@/components/common/currency";
import { ROUTES } from "@/constants/routes";
import { formatDate, formatNumber } from "@/lib/format";
import { RoyaltyNotes } from "@/features/books/components/royalty-notes";
import { getRoyaltyNotes } from "@/features/books/utils/royalty";
import type { BookDTO } from "@/shared/types/dto";

function HelpLink({ bookId }: { bookId: string }) {
  return (
    <Link
      href={ROUTES.author.newTicket(bookId)}
      className={buttonVariants({ variant: "outline", size: "sm" })}
    >
      <LifeBuoy aria-hidden />
      Get help
    </Link>
  );
}

/** Desktop: a full table (scrolls inside its container on narrower screens). */
export function BooksTable({ books, threshold }: { books: BookDTO[]; threshold: number }) {
  return (
    <Card className="hidden py-0 lg:flex">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="pl-4">Book</TableHead>
            <TableHead>Genre</TableHead>
            <TableHead>Published</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">MRP</TableHead>
            <TableHead className="text-right">Copies sold</TableHead>
            <TableHead className="text-right">Earned</TableHead>
            <TableHead className="text-right">Paid</TableHead>
            <TableHead className="text-right">Pending</TableHead>
            <TableHead className="pr-4">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {books.map((b) => (
            <TableRow key={b.id} className="align-top">
              <TableCell className="max-w-72 pl-4 whitespace-normal">
                <div className="font-medium">{b.title}</div>
                <div className="font-mono text-xs text-muted-foreground">ISBN {b.isbn}</div>
                <RoyaltyNotes notes={getRoyaltyNotes(b, threshold)} className="mt-1" />
              </TableCell>
              <TableCell>{b.genre}</TableCell>
              <TableCell>{formatDate(b.publicationDate)}</TableCell>
              <TableCell>
                <BookStatusBadge status={b.status} isPublished={b.isPublished} />
              </TableCell>
              <TableCell className="text-right">
                <Currency amount={b.mrp} />
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatNumber(b.copiesSold)}</TableCell>
              <TableCell className="text-right">
                <Currency amount={b.royalty.earned} />
              </TableCell>
              <TableCell className="text-right">
                <Currency amount={b.royalty.paid} />
              </TableCell>
              <TableCell className="text-right font-medium">
                <Currency amount={b.royalty.pending} />
              </TableCell>
              <TableCell className="pr-4 text-right">
                <HelpLink bookId={b.id} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm">{children}</dd>
    </div>
  );
}

/** Mobile / tablet: one card per book. */
export function BookCards({ books, threshold }: { books: BookDTO[]; threshold: number }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:hidden">
      {books.map((b) => (
        <li key={b.id}>
          <Card size="sm" className="h-full">
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <BookStatusBadge status={b.status} isPublished={b.isPublished} />
                <h3 className="font-medium">{b.title}</h3>
                <p className="font-mono text-xs text-muted-foreground">ISBN {b.isbn}</p>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                <Field label="Genre">{b.genre}</Field>
                <Field label="Published">{formatDate(b.publicationDate)}</Field>
                <Field label="MRP">
                  <Currency amount={b.mrp} />
                </Field>
                <Field label="Copies sold">{formatNumber(b.copiesSold)}</Field>
                <Field label="Earned">
                  <Currency amount={b.royalty.earned} />
                </Field>
                <Field label="Paid">
                  <Currency amount={b.royalty.paid} />
                </Field>
                <Field label="Pending">
                  <Currency amount={b.royalty.pending} className="font-medium" />
                </Field>
                <Field label="Last payout">{formatDate(b.royalty.lastPayoutDate)}</Field>
              </dl>
              <RoyaltyNotes notes={getRoyaltyNotes(b, threshold)} />
              <HelpLink bookId={b.id} />
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
