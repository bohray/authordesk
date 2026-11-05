import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { CardGridSkeleton, LoadingRegion, TableSkeleton } from "@/components/common/Skeletons";
import { bookCardFields, bookTableColumns, summaryCardClass, summaryCardCount } from "@/constants/books";

const rowCount = 4;

/** Mirrors BooksOverview: summary cards, count heading, table (lg+) and cards (below lg). */
export function BooksSkeleton() {
  return (
    <LoadingRegion label="Loading your books" className="space-y-6">
      <CardGridSkeleton
        count={summaryCardCount}
        className="lg:grid-cols-5"
        cardClassName={summaryCardClass}
      />
      <div className="space-y-3">
        <Skeleton className="h-5 w-16" />
        <TableSkeleton
          columns={bookTableColumns}
          rows={rowCount}
          rowClassName="h-20"
          className="hidden border-0 ring-1 ring-border lg:block"
        />
        <ul className="grid gap-3 sm:grid-cols-2 lg:hidden" aria-hidden>
          {Array.from({ length: rowCount }, (_, i) => (
            <li key={i}>
              <Card size="sm" className="h-full">
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Skeleton className="h-5 w-24 rounded-full" />
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {bookCardFields.map((field) => (
                      <div key={field} className="space-y-1">
                        <Skeleton className="h-3 w-14" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    ))}
                  </div>
                  <Skeleton className="h-7 w-24" />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </LoadingRegion>
  );
}
