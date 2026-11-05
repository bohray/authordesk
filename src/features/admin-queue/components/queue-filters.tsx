"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/forms/select-field";
import { useDebounce } from "@/hooks/use-debounce";
import { SEARCH_DEBOUNCE_MS } from "@/constants/ui";
import { cn } from "@/lib/utils";
import { DEFAULT_QUEUE_STATUS } from "@/features/admin-queue/hooks/use-queue-filters";
import {
  TICKET_CATEGORIES,
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITIES,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUSES,
  TICKET_STATUS_LABELS,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "@/shared/constants/ticket";
import type { AdminQueueQuery, QueueAssignee, QueueSort } from "@/types/queue";

const ANY = "any";

const CATEGORY_OPTIONS = [
  { value: ANY, label: "All categories" },
  ...TICKET_CATEGORIES.map((c) => ({ value: c, label: TICKET_CATEGORY_LABELS[c] })),
];
const PRIORITY_OPTIONS = [
  { value: ANY, label: "All priorities" },
  ...TICKET_PRIORITIES.map((p) => ({ value: p, label: TICKET_PRIORITY_LABELS[p] })),
];
const ASSIGNEE_OPTIONS = [
  { value: ANY, label: "Anyone" },
  { value: "me", label: "Assigned to me" },
  { value: "unassigned", label: "Unassigned" },
];
const SORT_OPTIONS = [
  { value: "urgency", label: "Most urgent" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
];

/** Search box with local state; pushes to the URL once typing settles. */
function SearchBox({ initial, onSearch }: { initial: string; onSearch: (q: string) => void }) {
  const [value, setValue] = useState(initial);
  const debounced = useDebounce(value, SEARCH_DEBOUNCE_MS);
  useEffect(() => {
    if (debounced.trim() !== initial.trim()) onSearch(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the settled value
  }, [debounced]);
  return (
    <div className="relative min-w-0 flex-1">
      <Search
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search ticket #, subject, author or book…"
        aria-label="Search tickets"
        className="h-9 pl-8"
      />
    </div>
  );
}

export function QueueFilters({
  query,
  onChange,
  onReset,
  isFiltered,
  resetKey,
}: {
  query: AdminQueueQuery;
  onChange: (patch: Partial<AdminQueueQuery>) => void;
  onReset: () => void;
  isFiltered: boolean;
  resetKey: number;
}) {
  const toggleStatus = (s: TicketStatus) => {
    const has = query.status.includes(s);
    const next = has ? query.status.filter((x) => x !== s) : [...query.status, s];
    // Deselecting the last status means "all" rather than "nothing".
    onChange({ status: TICKET_STATUSES.filter((x) => next.includes(x)) });
  };
  const allSelected = query.status.length === 0;
  const unresolvedOnly =
    query.status.length === DEFAULT_QUEUE_STATUS.length &&
    DEFAULT_QUEUE_STATUS.every((s) => query.status.includes(s));

  const chip = (active: boolean) =>
    cn(
      "inline-flex h-7 items-center rounded-full border px-3 text-xs font-medium whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
      active
        ? "border-primary bg-primary text-primary-foreground"
        : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
    );

  return (
    <div className="mb-4 space-y-3 rounded-xl border bg-background p-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchBox key={resetKey} initial={query.q} onSearch={(q) => onChange({ q })} />
        <div className="flex items-center gap-2">
          <Label htmlFor="queue-sort" className="shrink-0 text-xs text-muted-foreground">
            Sort
          </Label>
          <SelectField
            id="queue-sort"
            value={query.sort}
            onValueChange={(v) => onChange({ sort: v as QueueSort })}
            options={SORT_OPTIONS}
            className="h-9 sm:w-40"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Status filter">
        <span className="mr-1 text-xs text-muted-foreground">Status</span>
        <button
          type="button"
          className={chip(unresolvedOnly)}
          aria-pressed={unresolvedOnly}
          onClick={() => onChange({ status: [...DEFAULT_QUEUE_STATUS] })}
        >
          Unresolved
        </button>
        <button
          type="button"
          className={chip(allSelected)}
          aria-pressed={allSelected}
          onClick={() => onChange({ status: [] })}
        >
          All
        </button>
        <span className="mx-1 h-4 w-px bg-border" aria-hidden />
        {TICKET_STATUSES.map((s) => {
          const active = !allSelected && query.status.includes(s);
          return (
            <button
              key={s}
              type="button"
              className={chip(active)}
              aria-pressed={active}
              onClick={() => toggleStatus(s)}
            >
              {TICKET_STATUS_LABELS[s]}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-[1fr_1fr_1fr_auto_auto_auto]">
        <SelectField
          value={query.category ?? ANY}
          onValueChange={(v) => onChange({ category: v === ANY ? null : (v as TicketCategory) })}
          options={CATEGORY_OPTIONS}
          ariaLabel="Category"
          className="h-9"
        />
        <SelectField
          value={query.priority ?? ANY}
          onValueChange={(v) => onChange({ priority: v === ANY ? null : (v as TicketPriority) })}
          options={PRIORITY_OPTIONS}
          ariaLabel="Priority"
          className="h-9"
        />
        <SelectField
          value={query.assignee ?? ANY}
          onValueChange={(v) => onChange({ assignee: v === ANY ? null : (v as QueueAssignee) })}
          options={ASSIGNEE_OPTIONS}
          ariaLabel="Assignee"
          className="h-9"
        />
        <div className="flex items-center gap-1.5">
          <Label htmlFor="queue-from" className="shrink-0 text-xs text-muted-foreground">
            From
          </Label>
          <Input
            id="queue-from"
            type="date"
            value={query.from ?? ""}
            max={query.to ?? undefined}
            onChange={(e) => onChange({ from: e.target.value || null })}
            className="h-9"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Label htmlFor="queue-to" className="shrink-0 text-xs text-muted-foreground">
            To
          </Label>
          <Input
            id="queue-to"
            type="date"
            value={query.to ?? ""}
            min={query.from ?? undefined}
            onChange={(e) => onChange({ to: e.target.value || null })}
            className="h-9"
          />
        </div>
        <Button
          variant="ghost"
          onClick={onReset}
          disabled={!isFiltered && query.sort === "urgency"}
          className="h-9"
        >
          <X aria-hidden />
          Clear
        </Button>
      </div>
    </div>
  );
}
