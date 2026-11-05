"use client";

import type { LucideIcon } from "lucide-react";
import {
  ArrowRightLeft,
  CirclePlus,
  History,
  MessageSquare,
  Sparkles,
  StickyNote,
  Tag,
  Flag,
  UserCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RelativeTime } from "@/components/common/relative-time";
import {
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  type TicketEventType,
} from "@/shared/constants/ticket";
import type { TicketEventDTO } from "@/shared/types/dto";

const ICONS: Record<TicketEventType, LucideIcon> = {
  CREATED: CirclePlus,
  STATUS_CHANGED: ArrowRightLeft,
  CATEGORY_CHANGED: Tag,
  PRIORITY_CHANGED: Flag,
  ASSIGNED: UserCheck,
  AI_CLASSIFIED: Sparkles,
  REPLIED: MessageSquare,
  NOTE_ADDED: StickyNote,
};

const LABELS: Record<string, string> = {
  ...TICKET_STATUS_LABELS,
  ...TICKET_CATEGORY_LABELS,
  ...TICKET_PRIORITY_LABELS,
};

/** Human label for enum values; composite values like "ROYALTY_PAYMENTS/HIGH" are split. */
function label(value: string | null): string {
  if (!value) return "none";
  return value
    .split(/[/,|]/)
    .map((part) => LABELS[part.trim()] ?? part.trim())
    .join(" · ");
}

function describe(e: TicketEventDTO): string {
  switch (e.type) {
    case "CREATED":
      return `${e.actorName} opened the ticket`;
    case "STATUS_CHANGED":
      return `${e.actorName} changed status ${e.from ? `from ${label(e.from)} ` : ""}to ${label(e.to)}`;
    case "CATEGORY_CHANGED":
      return `${e.actorName} changed category ${e.from ? `from ${label(e.from)} ` : ""}to ${label(e.to)}`;
    case "PRIORITY_CHANGED":
      return `${e.actorName} changed priority ${e.from ? `from ${label(e.from)} ` : ""}to ${label(e.to)}`;
    case "ASSIGNED":
      return e.to ? `${e.actorName} assigned the ticket to ${e.to}` : `${e.actorName} unassigned the ticket`;
    case "AI_CLASSIFIED":
      return e.to ? `${e.actorName} classified it as ${label(e.to)}` : `${e.actorName} ran classification`;
    case "REPLIED":
      return `${e.actorName} replied`;
    case "NOTE_ADDED":
      return `${e.actorName} added an internal note`;
    default:
      return `${e.actorName}: ${String(e.type).toLowerCase().replace(/_/g, " ")}`;
  }
}

export function ActivityTimeline({ events }: { events: TicketEventDTO[] }) {
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
              const Icon = ICONS[e.type] ?? History;
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
