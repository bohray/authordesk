"use client";

import { AlertTriangle, RotateCw, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/forms/select-field";
import { AiSourceBadge } from "@/components/common/ai-source-badge";
import { Spinner } from "@/components/common/loading-state";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useRetryAi, useUpdateTicket } from "@/features/admin-ticket/hooks/use-admin-ticket";
import {
  TICKET_CATEGORIES,
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITIES,
  TICKET_PRIORITY_LABELS,
  type TicketCategory,
  type TicketPriority,
} from "@/shared/constants/ticket";
import type { AdminTicketDetailDTO } from "@/shared/types/dto";

const CATEGORY_OPTIONS = TICKET_CATEGORIES.map((c) => ({ value: c, label: TICKET_CATEGORY_LABELS[c] }));
const PRIORITY_OPTIONS = TICKET_PRIORITIES.map((p) => ({ value: p, label: TICKET_PRIORITY_LABELS[p] }));

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
          <Sparkles className="size-4 text-violet-600" aria-hidden />
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
                successMessage: `Category set to ${TICKET_CATEGORY_LABELS[v as TicketCategory]}`,
              })
            }
            options={CATEGORY_OPTIONS}
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
                successMessage: `Priority set to ${TICKET_PRIORITY_LABELS[v as TicketPriority]}`,
              })
            }
            options={PRIORITY_OPTIONS}
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
          <Alert className="border-amber-200 bg-amber-50 text-amber-900">
            <AlertTriangle aria-hidden />
            <AlertTitle>AI unavailable, rule-based fallback used</AlertTitle>
            <AlertDescription className="text-amber-800">
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
          <div className="space-y-2 rounded-lg bg-violet-50/60 px-3 py-2.5 text-sm">
            {confidence !== null && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">AI confidence</span>
                  <span className="font-medium tabular-nums">{formatPercent(confidence)}</span>
                </div>
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-violet-100"
                  role="meter"
                  aria-label="AI confidence"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(confidence * 100)}
                >
                  <div
                    className={cn(
                      "h-full rounded-full",
                      confidence >= 0.75 ? "bg-violet-600" : confidence >= 0.5 ? "bg-amber-500" : "bg-red-500",
                    )}
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
