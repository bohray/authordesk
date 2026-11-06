import { PageHeader } from "@/components/common/PageHeader";
import { plural } from "@/lib/format";

const queueOrderHint = "Unresolved first, highest priority and oldest at the top.";

/**
 * Shared by the queue and its `loading.tsx`, so the header never shifts. The open total
 * lives here (not in a stat card) so the stat cards only ever mean "filter".
 */
export function QueuePageHeader({ openCount }: { openCount?: number }) {
  return (
    <PageHeader
      title="Ticket Queue"
      description={
        openCount === undefined ? (
          queueOrderHint
        ) : (
          <>
            <span className="font-medium text-foreground">{plural(openCount, "open ticket")}</span>
            {` · ${queueOrderHint}`}
          </>
        )
      }
    />
  );
}
