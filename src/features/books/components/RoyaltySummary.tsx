import type { LucideIcon } from "lucide-react";
import { BookCopy, CalendarClock, CheckCircle2, Hourglass, IndianRupee } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { toneText } from "@/components/common/tones";
import { formatDate, formatINR, formatNumber, plural } from "@/lib/format";
import { cn } from "@/lib/utils";
import { summaryCardClass } from "@/features/books/components/layout";
import { getPayoutSummary } from "@/features/books/utils/royalty";
import type { MyBooksDTO } from "@/shared/types/dto";

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  footer?: ReactNode;
}

function StatCard({ label, value, icon: Icon, footer, className }: StatCardProps & { className?: string }) {
  return (
    <Card size="sm" className={className}>
      <CardContent className="space-y-1">
        <div className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
          {label}
          <Icon className="size-4" aria-hidden />
        </div>
        <div className="text-xl font-semibold tabular-nums">{value}</div>
        {footer && <div className="text-xs text-muted-foreground">{footer}</div>}
      </CardContent>
    </Card>
  );
}

export function RoyaltySummary({ data }: { data: MyBooksDTO }) {
  const { totals, books } = data;
  const payout = getPayoutSummary(data);
  const live = books.filter((b) => b.isPublished).length;

  const cards: StatCardProps[] = [
    {
      label: "Copies sold",
      value: formatNumber(totals.copiesSold),
      icon: BookCopy,
      footer: `${live} of ${plural(books.length, "book")} live`,
    },
    { label: "Royalty earned", value: formatINR(totals.earned), icon: IndianRupee, footer: "Lifetime" },
    { label: "Paid to you", value: formatINR(totals.paid), icon: CheckCircle2, footer: "Lifetime" },
    { label: "Pending", value: formatINR(totals.pending), icon: Hourglass, footer: "Earned, not yet paid" },
    {
      label: "Next payout",
      value: formatDate(data.nextPayoutDate),
      icon: CalendarClock,
      footer: <span className={cn(payout.tone === "warn" && toneText.warn)}>{payout.text}</span>,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {cards.map((card, i) => (
        <StatCard key={card.label} {...card} className={summaryCardClass(i)} />
      ))}
    </div>
  );
}
