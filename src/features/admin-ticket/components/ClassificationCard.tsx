"use client";

import { AlertTriangle, RotateCw, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { SelectField } from "@/components/forms/SelectField";
import { AiSourceBadge } from "@/components/common/AiSourceBadge";
import { Spinner } from "@/components/common/LoadingState";
import { confidenceBar, toneCallout, toneText } from "@/components/common/tones";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useRetryAi, useUpdateTicket } from "@/features/admin-ticket/hooks/useAdminTicket";
import {
  ticketCategories,
  ticketCategoryLabels,
  ticketPriorities,
  ticketPriorityLabels,
  type TicketCategory,
  type TicketPriority,
} from "@/shared/constants/ticket";
import type { AdminTicketDetailDTO } from "@/shared/types/dto";

const categoryOptions = ticketCategories.map((c) => ({ value: c, label: ticketCategoryLabels[c] }));
const priorityOptions = ticketPriorities.map((p) => ({ value: p, label: ticketPriorityLabels[p] }));

/** Confidence bands for the bar colour (0..1). */
const confidenceHigh = 0.75;
const confidenceMedium = 0.5;

function confidenceBand(c: number): keyof typeof confidenceBar {
  if (c >= confidenceHigh) return "high";
  return c >= confidenceMedium ? "medium" : "low";
}

export function ClassificationCard({ ticket }: { ticket: AdminTicketDetailDTO }) {
  const update = useUpdateTicket(ticket.id);
  const retry = useRetryAi(ticket.id);
  const { ai } = ticket;
  const pending = ticket.aiStatus === "PENDING";
  const failed = ticket.aiStatus === "FAILED";
  // Contract is 0..1; tolerate a 0..100 value defensively.
  const confidence =
    ai.confidence === null ? null : ai.confidence > 1 ? ai.confidence / 100 : ai.confidence;

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className={cn("size-4", toneText.ai)} aria-hidden />
          Classification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="ticket-category" className="text-xs text-muted-foreground">
              Category
            </Label>
            <AiSourceBadge source={ticket.categorySource} />
          </div>
          <SelectField
            id="ticket-category"
            value={ticket.category}
            placeholder={pending ? "Classifying…" : "Choose category"}
            onValueChange={(v) =>
              v !== ticket.category &&
              update.mutate({
                patch: { category: v as TicketCategory },
                successMessage: `Category set to ${ticketCategoryLabels[v as TicketCategory]}`,
              })
            }
            options={categoryOptions}
            disabled={update.isPending}
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="ticket-priority" className="text-xs text-muted-foreground">
              Priority
            </Label>
            <AiSourceBadge source={ticket.prioritySource} />
          </div>
          <SelectField
            id="ticket-priority"
            value={ticket.priority}
            placeholder={pending ? "Classifying…" : "Choose priority"}
            onValueChange={(v) =>
              v !== ticket.priority &&
              update.mutate({
                patch: { priority: v as TicketPriority },
                successMessage: `Priority set to ${ticketPriorityLabels[v as TicketPriority]}`,
              })
            }
            options={priorityOptions}
            disabled={update.isPending}
            className="h-9"
          />
        </div>

        {pending && (
          <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2">
            <Spinner label="Classifying…" />
            <Button variant="ghost" size="sm" onClick={() => retry.mutate()} disabled={retry.isPending}>
              <RotateCw className={cn(retry.isPending && "animate-spin")} aria-hidden />
              Retry
            </Button>
          </div>
        )}

        {failed && (
          <Alert className={toneCallout.warn}>
            <AlertTriangle aria-hidden />
            <AlertTitle>AI unavailable, rule-based fallback used</AlertTitle>
            <AlertDescription className={toneCallout.warnBody}>
              {ai.error && <p className="text-xs">{ai.error}</p>}
              <Button
                variant="outline"
                size="sm"
                className="mt-2 bg-background"
                onClick={() => retry.mutate()}
                disabled={retry.isPending}
              >
                <RotateCw className={cn(retry.isPending && "animate-spin")} aria-hidden />
                {retry.isPending ? "Retrying…" : "Retry AI"}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {ticket.aiStatus === "DONE" && (confidence !== null || ai.reasoning) && (
          <div className={cn("space-y-2 rounded-lg px-3 py-2.5 text-sm", toneCallout.ai)}>
            {confidence !== null && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">AI confidence</span>
                  <span className="font-medium tabular-nums">{formatPercent(confidence)}</span>
                </div>
                <div
                  className={cn("h-1.5 overflow-hidden rounded-full", toneCallout.aiTrack)}
                  role="meter"
                  aria-label="AI confidence"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(confidence * 100)}
                >
                  <div
                    className={cn("h-full rounded-full", confidenceBar[confidenceBand(confidence)])}
                    style={{ width: `${Math.min(100, Math.max(0, confidence * 100))}%` }}
                  />
                </div>
              </div>
            )}
            {ai.reasoning && <p className="text-xs leading-relaxed text-muted-foreground">{ai.reasoning}</p>}
            {ai.model && <p className="font-mono text-[10px] text-muted-foreground">{ai.model}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
