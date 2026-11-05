"use client";

import { History, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { RelativeTime } from "@/components/common/RelativeTime";
import { ticketEventIcons } from "@/constants/adminTicket";
import {
  ticketCategoryLabels,
  ticketPriorityLabels,
  ticketStatusLabels,
  type TicketEventType,
} from "@/shared/constants/ticket";
import type { TicketEventDTO } from "@/shared/types/dto";

/** Every enum label the timeline may need to print, keyed by raw value. */
const enumLabels: Record<string, string> = {
  ...ticketStatusLabels,
  ...ticketCategoryLabels,
  ...ticketPriorityLabels,
};

/** Human label for enum values; composite values like "ROYALTY_PAYMENTS/HIGH" are split. */
function label(value: string | null): string {
  if (!value) return "none";
  return value
    .split(/[/,|]/)
    .map((part) => enumLabels[part.trim()] ?? part.trim())
    .join(" · ");
}

/** "from X " when a previous value exists, so changes read "changed status from Open to Resolved". */
const fromPart = (e: TicketEventDTO) => (e.from ? `from ${label(e.from)} ` : "");

/** One sentence per event type. Exhaustive, so a new event type is a compile error here. */
const eventDescribers = {
  CREATED: (e) => `${e.actorName} opened the ticket`,
  STATUS_CHANGED: (e) => `${e.actorName} changed status ${fromPart(e)}to ${label(e.to)}`,
  CATEGORY_CHANGED: (e) => `${e.actorName} changed category ${fromPart(e)}to ${label(e.to)}`,
  PRIORITY_CHANGED: (e) => `${e.actorName} changed priority ${fromPart(e)}to ${label(e.to)}`,
  ASSIGNED: (e) =>
    e.to ? `${e.actorName} assigned the ticket to ${e.to}` : `${e.actorName} unassigned the ticket`,
  AI_CLASSIFIED: (e) =>
    e.to ? `${e.actorName} classified it as ${label(e.to)}` : `${e.actorName} ran classification`,
  REPLIED: (e) => `${e.actorName} replied`,
  NOTE_ADDED: (e) => `${e.actorName} added an internal note`,
} satisfies Record<TicketEventType, (e: TicketEventDTO) => string>;

function describe(e: TicketEventDTO): string {
  // Fallback guards against an event type newer than this client bundle.
  const fn: ((e: TicketEventDTO) => string) | undefined = eventDescribers[e.type];
  return fn ? fn(e) : `${e.actorName}: ${String(e.type).toLowerCase().replace(/_/g, " ")}`;
}

export function ActivityTimeline({ events }: { events: TicketEventDTO[] }) {
  // Newest first. Sorting a copy keeps the cached query data untouched.
  const sorted = [...events].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-4 text-muted-foreground" aria-hidden />
          Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ol className="relative space-y-3 border-l pl-4">
            {sorted.map((e) => {
              // Fallback covers an event type newer than this client bundle.
              const Icon: LucideIcon = ticketEventIcons[e.type] ?? History;
              return (
                <li key={e.id} className="relative">
                  <span className="absolute top-0.5 -left-[25px] flex size-4.5 items-center justify-center rounded-full border bg-background">
                    <Icon className="size-2.5 text-muted-foreground" aria-hidden />
                  </span>
                  <p className="text-sm">{describe(e)}</p>
                  <p className="text-xs text-muted-foreground">
                    <RelativeTime date={e.createdAt} />
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
