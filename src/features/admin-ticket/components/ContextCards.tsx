import type { ReactNode } from "react";
import { BookOpen, UserRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { BookStatusBadge } from "@/components/common/BookStatusBadge";
import { Currency } from "@/components/common/Currency";
import { toneText } from "@/components/common/tones";
import { formatDate, formatNumber, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdminTicketDetailDTO, BookDTO } from "@/shared/types/dto";

/** Shown for fields that have no value yet. */
const missingValue = "—";

interface DetailRow {
  label: string;
  value: ReactNode;
}

/**
 * Divider-free label/value list: rhythm comes from spacing, not lines, so a dense side
 * panel stays calm and scannable.
 */
function DetailList({ rows }: { rows: DetailRow[] }) {
  return (
    <dl className="space-y-1.5 text-sm">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-3">
          <dt className="shrink-0 text-muted-foreground">{row.label}</dt>
          <dd className="min-w-0 text-right break-words">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">{children}</p>
  );
}

function CardIconTitle({ icon: Icon, children }: { icon: typeof UserRound; children: ReactNode }) {
  return (
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" aria-hidden />
        {children}
      </CardTitle>
    </CardHeader>
  );
}

export function AuthorContextCard({ ticket }: { ticket: AdminTicketDetailDTO }) {
  const { author, authorProfile: profile } = ticket;
  const rows: DetailRow[] = profile
    ? [
        { label: "Author code", value: <span className="font-mono text-xs">{profile.code}</span> },
        {
          label: "Phone",
          value: profile.phone ? (
            <a href={`tel:${profile.phone.replace(/[^\d+]/g, "")}`} className="hover:underline">
              {profile.phone}
            </a>
          ) : (
            missingValue
          ),
        },
        { label: "City", value: profile.city || missingValue },
        { label: "Joined", value: formatDate(profile.joinedDate) },
      ]
    : [];

  return (
    <Card size="sm">
      <CardIconTitle icon={UserRound}>Author</CardIconTitle>
      <CardContent className="space-y-4">
        {/* Identity first: who this is and how to reach them, without "Name"/"Email" labels. */}
        <div className="flex items-center gap-3">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
            aria-hidden
          >
            {initials(author.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{author.name}</p>
            <a
              href={`mailto:${author.email}`}
              className="block truncate text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              {author.email}
            </a>
          </div>
        </div>
        {rows.length > 0 && <DetailList rows={rows} />}
      </CardContent>
    </Card>
  );
}

/** Earned · Paid · Pending side by side: the numbers most royalty tickets are about. */
function RoyaltyFigures({ royalty }: { royalty: BookDTO["royalty"] }) {
  const figures = [
    { label: "Earned", amount: royalty.earned, emphasis: false },
    { label: "Paid", amount: royalty.paid, emphasis: false },
    { label: "Pending", amount: royalty.pending, emphasis: true },
  ];
  return (
    <dl className="grid grid-cols-3 gap-1 rounded-lg bg-muted/50 p-1">
      {figures.map((figure) => (
        <div key={figure.label} className="px-2 py-1.5">
          <dt className="text-xs text-muted-foreground">{figure.label}</dt>
          <dd
            className={cn(
              "mt-0.5 tabular-nums",
              figure.emphasis ? "font-semibold" : "font-medium",
              figure.emphasis && figure.amount > 0 && toneText.warn,
            )}
          >
            <Currency amount={figure.amount} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function bookDetailRows(book: BookDTO): DetailRow[] {
  const neverPaid = !book.royalty.lastPayoutDate;
  return [
    { label: "Published", value: book.publicationDate ? formatDate(book.publicationDate) : "Not yet" },
    { label: "MRP", value: <Currency amount={book.mrp} /> },
    { label: "Copies sold", value: <span className="tabular-nums">{formatNumber(book.copiesSold)}</span> },
    {
      label: "Last payout",
      value: neverPaid ? (
        <span className={cn("font-medium", toneText.warn)}>Never paid</span>
      ) : (
        formatDate(book.royalty.lastPayoutDate)
      ),
    },
    ...(book.printPartner ? [{ label: "Print partner", value: book.printPartner }] : []),
  ];
}

export function BookDetailsCard({ ticket }: { ticket: AdminTicketDetailDTO }) {
  const book = ticket.bookDetails;
  return (
    <Card size="sm">
      <CardIconTitle icon={BookOpen}>Book</CardIconTitle>
      <CardContent>
        {!book ? (
          <p className="text-sm text-muted-foreground">
            General / account-level query. No specific book attached.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <div>
                <p className="font-medium leading-snug">{book.title}</p>
                <p className="font-mono text-xs text-muted-foreground">ISBN {book.isbn}</p>
              </div>
              <BookStatusBadge status={book.status} isPublished={book.isPublished} />
            </div>

            <section>
              <SectionLabel>Royalties</SectionLabel>
              <RoyaltyFigures royalty={book.royalty} />
            </section>

            <section>
              <SectionLabel>Details</SectionLabel>
              <DetailList rows={bookDetailRows(book)} />
            </section>

            <section>
              <SectionLabel>Available on</SectionLabel>
              {book.availableOn.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5">
                  {book.availableOn.map((platform) => (
                    <li key={platform} className="rounded-md border bg-background px-2 py-0.5 text-xs">
                      {platform}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Not yet listed</p>
              )}
            </section>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
