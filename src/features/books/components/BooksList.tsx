import type { ReactNode } from "react";
import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { buttonVariants } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { BookStatusBadge } from "@/components/common/BookStatusBadge";
import { Currency } from "@/components/common/Currency";
import { routes } from "@/constants/routes";
import { formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { bookCardFields, bookTableColumns, numericBookColumns, type BookCardField } from "@/constants/books";
import { RoyaltyNotes } from "@/features/books/components/RoyaltyNotes";
import type { RoyaltyNote } from "@/features/books/utils/royalty";
import type { BookDTO } from "@/shared/types/dto";

/** Notes per book id, computed once by the parent and shared by the table and the cards. */
export type NotesByBook = ReadonlyMap<string, RoyaltyNote[]>;

const lastColumnIndex = bookTableColumns.length - 1;

function HelpLink({ bookId }: { bookId: string }) {
  return (
    <Link
      href={routes.author.newTicket(bookId)}
      className={buttonVariants({ variant: "outline", size: "sm" })}
    >
      <LifeBuoy aria-hidden />
      Get help
    </Link>
  );
}

/** Desktop: a full table (scrolls inside its container on narrower screens). */
export function BooksTable({ books, notes }: { books: BookDTO[]; notes: NotesByBook }) {
  return (
    <Card className="hidden py-0 lg:flex">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            {bookTableColumns.map((label, i) => (
              <TableHead
                key={label || "actions"}
                className={cn(
                  i === 0 && "pl-4",
                  i === lastColumnIndex && "pr-4",
                  numericBookColumns.has(label) && "text-right",
                )}
              >
                {label || <span className="sr-only">Actions</span>}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {books.map((b) => (
            <TableRow key={b.id} className="align-top">
              <TableCell className="max-w-72 pl-4 whitespace-normal">
                <div className="font-medium">{b.title}</div>
                <div className="font-mono text-xs text-muted-foreground">ISBN {b.isbn}</div>
                <RoyaltyNotes notes={notes.get(b.id) ?? []} className="mt-1" />
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm">{children}</dd>
    </div>
  );
}

/** How each mobile card field renders; exhaustive so a new field in `bookCardFields` can't be missed. */
const cardFieldValue = {
  Genre: (b) => b.genre,
  Published: (b) => formatDate(b.publicationDate),
  MRP: (b) => <Currency amount={b.mrp} />,
  "Copies sold": (b) => formatNumber(b.copiesSold),
  Earned: (b) => <Currency amount={b.royalty.earned} />,
  Paid: (b) => <Currency amount={b.royalty.paid} />,
  Pending: (b) => <Currency amount={b.royalty.pending} className="font-medium" />,
  "Last payout": (b) => formatDate(b.royalty.lastPayoutDate),
} satisfies Record<BookCardField, (b: BookDTO) => ReactNode>;

/** Mobile / tablet: one card per book. */
export function BookCards({ books, notes }: { books: BookDTO[]; notes: NotesByBook }) {
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
                {bookCardFields.map((field) => (
                  <Field key={field} label={field}>
                    {cardFieldValue[field](b)}
                  </Field>
                ))}
              </dl>
              <RoyaltyNotes notes={notes.get(b.id) ?? []} />
              <HelpLink bookId={b.id} />
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
