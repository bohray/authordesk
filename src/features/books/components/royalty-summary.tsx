import type { LucideIcon } from "lucide-react";
import { BookCopy, CalendarClock, CheckCircle2, Hourglass, IndianRupee } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatINR, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getPayoutSummary } from "@/features/books/utils/royalty";
import type { MyBooksDTO } from "@/shared/types/dto";

function StatCard({
  label,
  value,
  icon: Icon,
  footer,
  className,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  footer?: ReactNode;
  className?: string;
}) {
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
  const { totals } = data;
  const payout = getPayoutSummary(data);
  const live = data.books.filter((b) => b.isPublished).length;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <StatCard
        label="Copies sold"
        value={formatNumber(totals.copiesSold)}
        icon={BookCopy}
        footer={`${live} of ${data.books.length} book${data.books.length === 1 ? "" : "s"} live`}
      />
      <StatCard label="Royalty earned" value={formatINR(totals.earned)} icon={IndianRupee} footer="Lifetime" />
      <StatCard label="Paid to you" value={formatINR(totals.paid)} icon={CheckCircle2} footer="Lifetime" />
      <StatCard
        label="Pending"
        value={formatINR(totals.pending)}
        icon={Hourglass}
        footer="Earned, not yet paid"
      />
      <StatCard
        label="Next payout"
        value={formatDate(data.nextPayoutDate)}
        icon={CalendarClock}
        className="col-span-2 lg:col-span-1"
        footer={
          <span className={cn(payout.tone === "warn" && "text-amber-700")}>{payout.text}</span>
        }
      />
    </div>
  );
}
