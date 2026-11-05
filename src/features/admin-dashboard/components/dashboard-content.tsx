"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AlarmClock, Bot, Flag, ListChecks, UserX } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNow } from "@/components/common/relative-time";
import { TONE_TEXT } from "@/components/common/tones";
import { ROUTES } from "@/constants/routes";
import { AGE_DANGER_HOURS, AGE_WARN_HOURS, PRIORITY_DOT_CLASSES, STATUS_DOT_CLASSES } from "@/constants/ui";
import { formatAge, formatDateTime, formatNumber, formatPercent, hoursSince } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  TICKET_PRIORITIES,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUSES,
  TICKET_STATUS_LABELS,
} from "@/shared/constants/ticket";
import type { AdminStatsDTO } from "@/shared/types/dto";

/** Above these ratios the AI health numbers are highlighted. */
const FAILURE_RATE_ALERT = 0.2;
const FALLBACK_RATE_WARN = 0.25;
const OVERRIDE_RATE_WARN = 0.25;

const QUICK_LINK_CLASS =
  "inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 hover:bg-muted";

const QUICK_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: `${ROUTES.admin.tickets}?assignee=unassigned`, label: "View unassigned", icon: UserX },
  { href: `${ROUTES.admin.tickets}?sort=oldest`, label: "Oldest first", icon: AlarmClock },
];

function Panel({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card size="sm" className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="size-4 text-muted-foreground" aria-hidden />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function BarList({
  rows,
}: {
  rows: { key: string; label: string; value: number; dot: string; href?: string }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2">
      {rows.map((r) => {
        const content = (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className={cn("size-2.5 rounded-full", r.dot)} aria-hidden />
                {r.label}
              </span>
              <span className="font-medium tabular-nums">{formatNumber(r.value)}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div className={cn("h-full rounded-full", r.dot)} style={{ width: `${(r.value / max) * 100}%` }} />
            </div>
          </>
        );
        return (
          <li key={r.key}>
            {r.href ? (
              <Link href={r.href} className="block rounded-md p-1 -m-1 hover:bg-muted/50">
                {content}
              </Link>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Metric({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: string; tone?: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("text-lg font-semibold tabular-nums", tone)}>{value}</dd>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Loaded as its own chunk by DashboardView (in parallel with the stats request). */
export function DashboardContent({ data }: { data: AdminStatsDTO }) {
  const now = useNow();
  const oldestHours = data.oldestOpenAt ? hoursSince(data.oldestOpenAt, now) : 0;
  const ageTone =
    oldestHours > AGE_DANGER_HOURS
      ? TONE_TEXT.danger
      : oldestHours > AGE_WARN_HOURS
        ? TONE_TEXT.warn
        : undefined;
  const openTotal =
    TICKET_PRIORITIES.reduce((s, p) => s + (data.openByPriority[p] ?? 0), 0) +
    (data.openByPriority.UNCLASSIFIED ?? 0);
  const failureRate = data.ai.calls > 0 ? data.ai.failures / data.ai.calls : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Open tickets" value={formatNumber(openTotal)} hint="Open + In progress" />
        <Metric
          label="Unassigned"
          value={formatNumber(data.unassigned)}
          tone={data.unassigned > 0 ? TONE_TEXT.attention : undefined}
          hint="Need an owner"
        />
        <Metric
          label="Oldest open ticket"
          value={data.oldestOpenAt ? formatAge(data.oldestOpenAt, now) : "—"}
          tone={ageTone}
          hint={data.oldestOpenAt ? `Since ${formatDateTime(data.oldestOpenAt)}` : "Nothing open"}
        />
        <Metric
          label="Critical + High open"
          value={formatNumber((data.openByPriority.CRITICAL ?? 0) + (data.openByPriority.HIGH ?? 0))}
          tone={(data.openByPriority.CRITICAL ?? 0) > 0 ? TONE_TEXT.danger : undefined}
          hint="Handle these first"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Panel title="Open by priority" icon={Flag}>
          <BarList
            rows={[
              ...TICKET_PRIORITIES.map((p) => ({
                key: p,
                label: TICKET_PRIORITY_LABELS[p],
                value: data.openByPriority[p] ?? 0,
                dot: PRIORITY_DOT_CLASSES[p],
                href: `${ROUTES.admin.tickets}?priority=${p}`,
              })),
              {
                key: "UNCLASSIFIED",
                label: "Unclassified",
                value: data.openByPriority.UNCLASSIFIED ?? 0,
                dot: PRIORITY_DOT_CLASSES.UNCLASSIFIED,
              },
            ]}
          />
        </Panel>

        <Panel title="Tickets by status" icon={ListChecks}>
          <BarList
            rows={TICKET_STATUSES.map((s) => ({
              key: s,
              label: TICKET_STATUS_LABELS[s],
              value: data.byStatus[s] ?? 0,
              dot: STATUS_DOT_CLASSES[s],
              href: `${ROUTES.admin.tickets}?status=${s}`,
            }))}
          />
        </Panel>

        <Panel title="AI health" icon={Bot} className="md:col-span-2 xl:col-span-1">
          <dl className="grid grid-cols-2 gap-2">
            <Metric label="AI calls" value={formatNumber(data.ai.calls)} />
            <Metric
              label="Failures"
              value={formatNumber(data.ai.failures)}
              hint={`${formatPercent(failureRate, 1)} of calls`}
              tone={failureRate > FAILURE_RATE_ALERT ? TONE_TEXT.danger : undefined}
            />
            <Metric
              label="Fallback rate"
              value={formatPercent(data.ai.fallbackRate, 1)}
              hint="Classified by rules"
              tone={data.ai.fallbackRate > FALLBACK_RATE_WARN ? TONE_TEXT.warn : undefined}
            />
            <Metric
              label="Override rate"
              value={formatPercent(data.ai.overrideRate, 1)}
              hint="AI labels changed by admins"
              tone={data.ai.overrideRate > OVERRIDE_RATE_WARN ? TONE_TEXT.warn : undefined}
            />
            <Metric label="Tokens in" value={formatNumber(data.ai.inputTokens)} />
            <Metric label="Tokens out" value={formatNumber(data.ai.outputTokens)} />
          </dl>
        </Panel>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={QUICK_LINK_CLASS}>
            <Icon className="size-4" aria-hidden /> {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
