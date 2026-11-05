"use client";

import { Sparkles } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RelativeTime } from "@/components/common/relative-time";
import { TONE_TEXT } from "@/components/common/tones";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Role } from "@/shared/constants/roles";
import type { TicketMessageDTO } from "@/shared/types/dto";

/** Sender label by viewer → sender role. A lookup table instead of nested ternaries. */
const SENDER_LABEL = {
  AUTHOR: { AUTHOR: () => "You", ADMIN: (name: string) => `${name} · Support team` },
  ADMIN: { AUTHOR: (name: string) => `${name} · Author`, ADMIN: (name: string) => `${name} · Support` },
} satisfies Record<Role, Record<Role, (name: string) => string>>;

/**
 * Chat-style thread. `viewerRole` decides which side is "mine" and how senders are labelled:
 * authors see "You" and "{name} · Support team"; admins see the author name and "{name} · Support".
 */
export function ConversationThread({
  messages,
  viewerRole,
  showAiAssisted = false,
  emptyText = "No replies yet.",
}: {
  messages: TicketMessageDTO[];
  viewerRole: Role;
  showAiAssisted?: boolean;
  emptyText?: string;
}) {
  if (messages.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <ol className="space-y-4" aria-label="Conversation">
      {messages.map((m) => {
        const mine = m.senderRole === viewerRole;
        const isSupport = m.senderRole === "ADMIN";
        const label = SENDER_LABEL[viewerRole][m.senderRole](m.senderName);
        return (
          <li key={m.id} className={cn("flex gap-3", mine && "flex-row-reverse")}>
            <Avatar size="sm" className="mt-0.5">
              <AvatarFallback
                className={cn(isSupport && "bg-primary text-primary-foreground")}
              >
                {initials(m.senderName)}
              </AvatarFallback>
            </Avatar>
            <div className={cn("flex max-w-[85%] min-w-0 flex-col gap-1", mine && "items-end")}>
              <div
                className={cn(
                  "flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground",
                  mine && "justify-end",
                )}
              >
                <span className="font-medium text-foreground">{label}</span>
                <RelativeTime date={m.createdAt} />
                {showAiAssisted && m.aiAssisted && (
                  <span className={cn("inline-flex items-center gap-1", TONE_TEXT.ai)}>
                    <Sparkles className="size-3" aria-hidden /> AI-assisted
                  </span>
                )}
              </div>
              <div
                className={cn(
                  "rounded-xl px-3.5 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap",
                  isSupport
                    ? "bg-primary/5 ring-1 ring-primary/10"
                    : "bg-background ring-1 ring-border",
                )}
              >
                {m.body}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
