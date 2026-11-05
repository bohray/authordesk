"use client";

import { AlertTriangle, RotateCw, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { SelectField, type SelectOption } from "@/components/forms/SelectField";
import { AiSourceBadge } from "@/components/common/AiSourceBadge";
import { Spinner } from "@/components/common/LoadingState";
import { confidenceBar, toneCallout, toneText } from "@/components/common/tones";
import {
  classifyingLabel,
  confidenceThresholds,
  ticketCategoryOptions,
  ticketPriorityOptions,
  ticketUpdateMessages,
} from "@/constants/adminTicket";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useRetryAi, useUpdateTicket } from "@/features/admin-ticket/hooks/useAdminTicket";
import {
  ticketCategories,
  ticketCategoryLabels,
  ticketPriorities,
  ticketPriorityLabels,
  type ClassificationSource,
  type TicketCategory,
  type TicketPriority,
} from "@/shared/constants/ticket";
import type { AdminTicketDetailDTO } from "@/shared/types/dto";

const percentScale = 100;

function isCategory(value: string): value is TicketCategory {
  return (ticketCategories as readonly string[]).includes(value);
}

function isPriority(value: string): value is TicketPriority {
  return (ticketPriorities as readonly string[]).includes(value);
}

function confidenceBand(c: number): keyof typeof confidenceBar {
  if (c >= confidenceThresholds.high) return "high";
  return c >= confidenceThresholds.medium ? "medium" : "low";
}

/** The contract is 0..1; tolerate a 0..100 value defensively. */
function normalizeConfidence(value: number | null): number | null {
  if (value === null) return null;
  return value > 1 ? value / percentScale : value;
}

/** Labelled select with the badge showing where the current value came from (AI, rule, admin). */
function ClassificationSelect({
  id,
  label,
  source,
  value,
  placeholder,
  options,
  disabled,
  onValueChange,
}: {
  id: string;
  label: string;
  source: ClassificationSource | null;
  value: string | null;
  placeholder: string;
  options: SelectOption[];
  disabled: boolean;
  onValueChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-xs text-muted-foreground">
          {label}
        </Label>
        <AiSourceBadge source={source} />
      </div>
      <SelectField
        id={id}
        value={value}
        placeholder={placeholder}
        onValueChange={onValueChange}
        options={options}
        disabled={disabled}
        className="h-9"
      />
    </div>
  );
}

function RetryIcon({ spinning }: { spinning: boolean }) {
  return <RotateCw className={cn(spinning && "animate-spin")} aria-hidden />;
}

function ConfidenceMeter({ confidence }: { confidence: number }) {
  const percent = confidence * percentScale;
  return (
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
        aria-valuemax={percentScale}
        aria-valuenow={Math.round(percent)}
      >
        <div
          className={cn("h-full rounded-full", confidenceBar[confidenceBand(confidence)])}
          style={{ width: `${Math.min(percentScale, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  );
}

export function ClassificationCard({ ticket }: { ticket: AdminTicketDetailDTO }) {
  const update = useUpdateTicket(ticket.id);
  const retry = useRetryAi(ticket.id);
  const { ai } = ticket;
  const pending = ticket.aiStatus === "PENDING";
  const failed = ticket.aiStatus === "FAILED";
  const confidence = normalizeConfidence(ai.confidence);
  const showInsight = ticket.aiStatus === "DONE" && (confidence !== null || !!ai.reasoning);

  const handleCategoryChange = (value: string) => {
    if (!isCategory(value) || value === ticket.category) return;
    update.mutate({
      patch: { category: value },
      successMessage: ticketUpdateMessages.category(ticketCategoryLabels[value]),
    });
  };

  const handlePriorityChange = (value: string) => {
    if (!isPriority(value) || value === ticket.priority) return;
    update.mutate({
      patch: { priority: value },
      successMessage: ticketUpdateMessages.priority(ticketPriorityLabels[value]),
    });
  };

  const handleRetry = () => retry.mutate();

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className={cn("size-4", toneText.ai)} aria-hidden />
          Classification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ClassificationSelect
          id="ticket-category"
          label="Category"
          source={ticket.categorySource}
          value={ticket.category}
          placeholder={pending ? classifyingLabel : "Choose category"}
          options={ticketCategoryOptions}
          disabled={update.isPending}
          onValueChange={handleCategoryChange}
        />
        <ClassificationSelect
          id="ticket-priority"
          label="Priority"
          source={ticket.prioritySource}
          value={ticket.priority}
          placeholder={pending ? classifyingLabel : "Choose priority"}
          options={ticketPriorityOptions}
          disabled={update.isPending}
          onValueChange={handlePriorityChange}
        />

        {pending && (
          <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2">
            <Spinner label={classifyingLabel} />
            <Button variant="ghost" size="sm" onClick={handleRetry} disabled={retry.isPending}>
              <RetryIcon spinning={retry.isPending} />
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
                onClick={handleRetry}
                disabled={retry.isPending}
              >
                <RetryIcon spinning={retry.isPending} />
                {retry.isPending ? "Retrying…" : "Retry AI"}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {showInsight && (
          <div className={cn("space-y-2 rounded-lg px-3 py-2.5 text-sm", toneCallout.ai)}>
            {confidence !== null && <ConfidenceMeter confidence={confidence} />}
            {ai.reasoning && <p className="text-xs leading-relaxed text-muted-foreground">{ai.reasoning}</p>}
            {ai.model && <p className="font-mono text-[10px] text-muted-foreground">{ai.model}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
