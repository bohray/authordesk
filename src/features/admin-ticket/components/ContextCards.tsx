import type { ReactNode } from "react";
import { BookOpen, UserRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { BookStatusBadge } from "@/components/common/BookStatusBadge";
import { Currency } from "@/components/common/Currency";
import { formatDate, formatNumber } from "@/lib/format";
import type { AdminTicketDetailDTO } from "@/shared/types/dto";

/** Shown for profile fields the author hasn't filled in. */
const missingValue = "—";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right break-words">{children}</dd>
    </div>
  );
}

export function AuthorContextCard({ ticket }: { ticket: AdminTicketDetailDTO }) {
  const p = ticket.authorProfile;
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserRound className="size-4 text-muted-foreground" aria-hidden />
          Author
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="divide-y">
          <Row label="Name">{ticket.author.name}</Row>
          <Row label="Email">
            <a href={`mailto:${ticket.author.email}`} className="hover:underline">
              {ticket.author.email}
            </a>
          </Row>
          {p ? (
            <>
              <Row label="Author code">
                <span className="font-mono">{p.code}</span>
              </Row>
              {p.phone && <Row label="Phone">{p.phone}</Row>}
              <Row label="City">{p.city || missingValue}</Row>
              <Row label="Joined">{formatDate(p.joinedDate)}</Row>
            </>
          ) : (
            <Row label="Profile">{missingValue}</Row>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}

export function BookDetailsCard({ ticket }: { ticket: AdminTicketDetailDTO }) {
  const b = ticket.bookDetails;
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="size-4 text-muted-foreground" aria-hidden />
          Book
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!b ? (
          <p className="text-sm text-muted-foreground">
            General / account-level query. No specific book attached.
          </p>
        ) : (
          <div className="space-y-2">
            <div>
              <p className="font-medium">{b.title}</p>
              <p className="font-mono text-xs text-muted-foreground">ISBN {b.isbn}</p>
            </div>
            <BookStatusBadge status={b.status} isPublished={b.isPublished} />
            <dl className="divide-y">
              <Row label="Published">{formatDate(b.publicationDate)}</Row>
              <Row label="MRP">
                <Currency amount={b.mrp} />
              </Row>
              <Row label="Copies sold">{formatNumber(b.copiesSold)}</Row>
              <Row label="Royalty earned">
                <Currency amount={b.royalty.earned} />
              </Row>
              <Row label="Paid">
                <Currency amount={b.royalty.paid} />
              </Row>
              <Row label="Pending">
                <Currency amount={b.royalty.pending} className="font-medium" />
              </Row>
              <Row label="Last payout">
                {b.royalty.lastPayoutDate ? formatDate(b.royalty.lastPayoutDate) : "Never paid"}
              </Row>
              {b.printPartner && <Row label="Print partner">{b.printPartner}</Row>}
              <Row label="Available on">
                {b.availableOn.length > 0 ? b.availableOn.join(", ") : "Not yet listed"}
              </Row>
            </dl>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
