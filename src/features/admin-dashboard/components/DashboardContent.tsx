"use client";

import Link from "next/link";
import { Bot, Flag, ListChecks } from "lucide-react";
import { useNow } from "@/components/common/RelativeTime";
import { toneText } from "@/components/common/tones";
import {
  aiHealthThresholds,
  dashboardQuickLinks,
  quickLinkClass,
  ratePrecision,
  unclassifiedPriority,
} from "@/constants/dashboard";
import { queueHref } from "@/constants/queue";
import { ageDangerHours, ageWarnHours, priorityDotClasses, statusDotClasses } from "@/constants/ui";
import { formatAge, formatDateTime, formatNumber, formatPercent, hoursSince } from "@/lib/format";
import {
  BarList,
  Metric,
  Panel,
  type BarRow,
} from "@/features/admin-dashboard/components/DashboardWidgets";
import {
  ticketPriorities,
  ticketPriorityLabels,
  ticketStatuses,
  ticketStatusLabels,
} from "@/shared/constants/ticket";
import type { AdminStatsDTO } from "@/shared/types/dto";

type Tone = (typeof toneText)[keyof typeof toneText];

/** Returns the tone only when the condition holds, so metrics stay neutral otherwise. */
const toneIf = (condition: boolean, tone: Tone): Tone | undefined => (condition ? tone : undefined);

function oldestAgeTone(hours: number): Tone | undefined {
  if (hours > ageDangerHours) return toneText.danger;
  if (hours > ageWarnHours) return toneText.warn;
  return undefined;
}

function SummaryMetrics({ data, now }: { data: AdminStatsDTO; now: number }) {
  const { openByPriority, oldestOpenAt } = data;
  // Includes UNCLASSIFIED alongside every priority.
  const openTotal = Object.values(openByPriority).reduce((sum, n) => sum + (n ?? 0), 0);
  const critical = openByPriority.CRITICAL ?? 0;
  const urgentOpen = critical + (openByPriority.HIGH ?? 0);
  const oldestHours = oldestOpenAt ? hoursSince(oldestOpenAt, now) : 0;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Metric label="Open tickets" value={formatNumber(openTotal)} hint="Open + In progress" />
      <Metric
        label="Unassigned"
        value={formatNumber(data.unassigned)}
        tone={toneIf(data.unassigned > 0, toneText.attention)}
        hint="Need an owner"
      />
      <Metric
        label="Oldest open ticket"
        value={oldestOpenAt ? formatAge(oldestOpenAt, now) : "—"}
        tone={oldestAgeTone(oldestHours)}
        hint={oldestOpenAt ? `Since ${formatDateTime(oldestOpenAt)}` : "Nothing open"}
      />
      <Metric
        label="Critical + High open"
        value={formatNumber(urgentOpen)}
        tone={toneIf(critical > 0, toneText.danger)}
        hint="Handle these first"
      />
    </div>
  );
}

function AiHealthPanel({ ai }: { ai: AdminStatsDTO["ai"] }) {
  const failureRate = ai.calls > 0 ? ai.failures / ai.calls : 0;
  return (
    <Panel title="AI health" icon={Bot} className="md:col-span-2 xl:col-span-1">
      <dl className="grid grid-cols-2 gap-2">
        <Metric label="AI calls" value={formatNumber(ai.calls)} />
        <Metric
          label="Failures"
          value={formatNumber(ai.failures)}
          hint={`${formatPercent(failureRate, ratePrecision)} of calls`}
          tone={toneIf(failureRate > aiHealthThresholds.failureRateAlert, toneText.danger)}
        />
        <Metric
          label="Fallback rate"
          value={formatPercent(ai.fallbackRate, ratePrecision)}
          hint="Classified by rules"
          tone={toneIf(ai.fallbackRate > aiHealthThresholds.fallbackRateWarn, toneText.warn)}
        />
        <Metric
          label="Override rate"
          value={formatPercent(ai.overrideRate, ratePrecision)}
          hint="AI labels changed by admins"
          tone={toneIf(ai.overrideRate > aiHealthThresholds.overrideRateWarn, toneText.warn)}
        />
        <Metric label="Tokens in" value={formatNumber(ai.inputTokens)} />
        <Metric label="Tokens out" value={formatNumber(ai.outputTokens)} />
      </dl>
    </Panel>
  );
}

function QuickLinks() {
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      {dashboardQuickLinks.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className={quickLinkClass}>
          <Icon className="size-4" aria-hidden /> {label}
        </Link>
      ))}
    </div>
  );
}

/** Loaded as its own chunk by DashboardView (in parallel with the stats request). */
export function DashboardContent({ data }: { data: AdminStatsDTO }) {
  const now = useNow();

  const priorityRows: BarRow[] = [
    ...ticketPriorities.map((p) => ({
      key: p,
      label: ticketPriorityLabels[p],
      value: data.openByPriority[p] ?? 0,
      dot: priorityDotClasses[p],
      href: queueHref({ priority: p }),
    })),
    {
      key: unclassifiedPriority.key,
      label: unclassifiedPriority.label,
      value: data.openByPriority[unclassifiedPriority.key] ?? 0,
      dot: priorityDotClasses[unclassifiedPriority.key],
    },
  ];

  const statusRows: BarRow[] = ticketStatuses.map((s) => ({
    key: s,
    label: ticketStatusLabels[s],
    value: data.byStatus[s] ?? 0,
    dot: statusDotClasses[s],
    href: queueHref({ status: s }),
  }));

  return (
    <div className="space-y-4">
      <SummaryMetrics data={data} now={now} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Panel title="Open by priority" icon={Flag}>
          <BarList rows={priorityRows} />
        </Panel>
        <Panel title="Tickets by status" icon={ListChecks}>
          <BarList rows={statusRows} />
        </Panel>
        <AiHealthPanel ai={data.ai} />
      </div>

      <QuickLinks />
    </div>
  );
}
