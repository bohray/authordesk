"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { SelectField } from "@/components/forms/SelectField";
import { useDebounce } from "@/hooks/useDebounce";
import { searchDebounceMs } from "@/constants/ui";
import {
  anyFilterValue,
  filterControlClass,
  queueDateFilters,
  queueSelectFilters,
  queueSortOptions,
  queueStatusPresets,
} from "@/constants/queue";
import { sameSet } from "@/features/admin-queue/hooks/useQueueFilters";
import { FilterChip } from "@/features/admin-queue/components/FilterChip";
import {
  defaultQueueSort,
  ticketStatuses,
  ticketStatusLabels,
  type TicketStatus,
} from "@/shared/constants/ticket";
import type { AdminQueueQuery, QueueSort } from "@/types/queue";

/** Search box with local state; pushes to the URL once typing settles. */
function SearchBox({ initial, onSearch }: { initial: string; onSearch: (q: string) => void }) {
  const [value, setValue] = useState(initial);
  const debounced = useDebounce(value, searchDebounceMs);
  // Effect event: reads the latest `initial`/`onSearch` without re-running when they change,
  // so only a newly settled value triggers a search (no suppressed deps lint).
  const pushSearch = useEffectEvent((q: string) => {
    if (q.trim() !== initial.trim()) onSearch(q);
  });
  useEffect(() => {
    pushSearch(debounced);
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
        className={`${filterControlClass} pl-8`}
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
  const allSelected = query.status.length === 0;

  const toggleStatus = (s: TicketStatus) => {
    const next = query.status.includes(s) ? query.status.filter((x) => x !== s) : [...query.status, s];
    // Keep canonical order; deselecting the last status means "all" rather than "nothing".
    onChange({ status: ticketStatuses.filter((x) => next.includes(x)) });
  };

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
            options={queueSortOptions}
            className={`${filterControlClass} sm:w-40`}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Status filter">
        <span className="mr-1 text-xs text-muted-foreground">Status</span>
        {queueStatusPresets.map((preset) => (
          <FilterChip
            key={preset.label}
            active={sameSet(query.status, preset.status)}
            onClick={() => onChange({ status: [...preset.status] })}
          >
            {preset.label}
          </FilterChip>
        ))}
        <span className="mx-1 h-4 w-px bg-border" aria-hidden />
        {ticketStatuses.map((s) => (
          <FilterChip
            key={s}
            active={!allSelected && query.status.includes(s)}
            onClick={() => toggleStatus(s)}
          >
            {ticketStatusLabels[s]}
          </FilterChip>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-[1fr_1fr_1fr_auto_auto_auto]">
        {queueSelectFilters.map((filter) => (
          <SelectField
            key={filter.key}
            value={query[filter.key] ?? anyFilterValue}
            // Options are generated from the shared enums, so the value is always valid for its key.
            onValueChange={(v) =>
              onChange({ [filter.key]: v === anyFilterValue ? null : v } as Partial<AdminQueueQuery>)
            }
            options={filter.options}
            ariaLabel={filter.label}
            className={filterControlClass}
          />
        ))}
        {queueDateFilters.map((filter) => {
          const id = `queue-${filter.key}`;
          const bound = query[filter.bound.key] ?? undefined;
          return (
            <div key={filter.key} className="flex items-center gap-1.5">
              <Label htmlFor={id} className="shrink-0 text-xs text-muted-foreground">
                {filter.label}
              </Label>
              <Input
                id={id}
                type="date"
                value={query[filter.key] ?? ""}
                min={filter.bound.attr === "min" ? bound : undefined}
                max={filter.bound.attr === "max" ? bound : undefined}
                onChange={(e) => onChange({ [filter.key]: e.target.value || null })}
                className={filterControlClass}
              />
            </div>
          );
        })}
        <Button
          variant="ghost"
          onClick={onReset}
          disabled={!isFiltered && query.sort === defaultQueueSort}
          className={filterControlClass}
        >
          <X aria-hidden />
          Clear
        </Button>
      </div>
    </div>
  );
}
