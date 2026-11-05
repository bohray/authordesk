/** Admin dashboard UI constants: alert thresholds, quick links and layout counts. */
import type { LucideIcon } from "lucide-react";
import { AlarmClock, UserX } from "lucide-react";
import { queueHref } from "@/constants/queue";

/** Above these ratios (0..1) the AI health numbers are highlighted. */
export const aiHealthThresholds = {
  failureRateAlert: 0.2,
  fallbackRateWarn: 0.25,
  overrideRateWarn: 0.25,
} as const;

/** Decimal places for the AI health percentages. */
export const ratePrecision = 1;

/** Key and label for open tickets the AI hasn't classified yet (they have no priority). */
export const unclassifiedPriority = { key: "UNCLASSIFIED", label: "Unclassified" } as const;

export const quickLinkClass =
  "inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 hover:bg-muted";

export const dashboardQuickLinks: { href: string; label: string; icon: LucideIcon }[] = [
  { href: queueHref({ assignee: "unassigned" }), label: "View unassigned", icon: UserX },
  { href: queueHref({ sort: "oldest" }), label: "Oldest first", icon: AlarmClock },
];

/** Tiles in the summary row and the AI health panel; the skeleton renders the same counts. */
export const summaryMetricCount = 4;
export const aiHealthMetricCount = 6;
