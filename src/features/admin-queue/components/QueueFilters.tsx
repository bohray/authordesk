"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { SelectField } from "@/components/forms/SelectField";
import { useDebounce } from "@/hooks/useDebounce";
import { searchDebounceMs } from "@/constants/ui";
import {
  anyFilterValue,
  customDateValue,
  filterControlClass,
  queueDateFilters,
  queueDateOptions,
  queueDatePresets,
  queueSelectFilters,
  queueSortOptions,
  type QueueDatePreset,
} from "@/constants/queue";
import { ActiveFilterPills } from "@/features/admin-queue/components/ActiveFilterPills";
import { StatusSwitch } from "@/features/admin-queue/components/StatusSwitch";
import { getActiveFilters } from "@/features/admin-queue/utils/activeFilters";
import { matchDateSelection, presetRange } from "@/features/admin-queue/utils/dateRange";
import { cn } from "@/lib/utils";
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
    <div className="relative min-w-0 flex-1 basis-64">
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
        className={cn(filterControlClass, "pl-8")}
      />
    </div>
  );
}

function isDatePreset(value: string): value is QueueDatePreset {
  return queueDatePresets.some((preset) => preset === value);
}

/** One "Created" dropdown with presets; "Custom range…" reveals the from/to inputs inline. */
function DateFilter({
  from,
  to,
  onChange,
}: {
  from: string | null;
  to: string | null;
  onChange: (patch: Partial<AdminQueueQuery>) => void;
}) {
  // Picking "Custom" with no dates yet still has to show the inputs, so remember the intent.
  const [customOpen, setCustomOpen] = useState(false);
  const selection = matchDateSelection(from, to);
  const showCustom = customOpen || selection === customDateValue;

  const handleSelect = (value: string) => {
    if (value === customDateValue) {
      setCustomOpen(true);
      return;
    }
    setCustomOpen(false);
    onChange(isDatePreset(value) ? presetRange(value) : { from: null, to: null });
  };

  const bounds = { from, to };
  return (
    <>
      <SelectField
        value={showCustom ? customDateValue : selection}
        onValueChange={handleSelect}
        options={queueDateOptions}
        ariaLabel="Created date"
        className={cn(filterControlClass, "sm:w-44")}
      />
      {showCustom &&
        queueDateFilters.map((filter) => {
          const id = `queue-${filter.key}`;
          const bound = bounds[filter.bound.key] ?? undefined;
          return (
            <div key={filter.key} className="flex items-center gap-1.5">
              <Label htmlFor={id} className="shrink-0 text-xs text-muted-foreground">
                {filter.label}
              </Label>
              <Input
                id={id}
                type="date"
                value={bounds[filter.key] ?? ""}
                min={filter.bound.attr === "min" ? bound : undefined}
                max={filter.bound.attr === "max" ? bound : undefined}
                onChange={(e) => onChange({ [filter.key]: e.target.value || null })}
                className={filterControlClass}
              />
            </div>
          );
        })}
    </>
  );
}

export function QueueFilters({
  query,
  onChange,
  onReset,
  resetKey,
}: {
  query: AdminQueueQuery;
  onChange: (patch: Partial<AdminQueueQuery>) => void;
  onReset: () => void;
  resetKey: number;
}) {
  const activeFilters = getActiveFilters(query);
  // Status views live in the switch, so they don't need pills; "Clear all" only appears
  // when something is actually narrowing the list.
  const showPills = activeFilters.length > 0 || query.q.trim() !== "";

  return (
    <div className="mb-4 space-y-3 rounded-xl border bg-background p-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox key={resetKey} initial={query.q} onSearch={(q) => onChange({ q })} />
        <StatusSwitch status={query.status} onChange={(status) => onChange({ status })} />
        <div className="flex items-center gap-2">
          <Label htmlFor="queue-sort" className="shrink-0 text-xs text-muted-foreground">
            Sort
          </Label>
          <SelectField
            id="queue-sort"
            value={query.sort}
            onValueChange={(v) => onChange({ sort: v as QueueSort })}
            options={queueSortOptions}
            className={cn(filterControlClass, "w-40")}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 [&>*]:min-w-40 [&>*]:flex-1 sm:[&>*]:flex-none">
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
            className={cn(filterControlClass, "sm:w-52")}
          />
        ))}
        <DateFilter key={resetKey} from={query.from} to={query.to} onChange={onChange} />
      </div>

      {showPills && <ActiveFilterPills filters={activeFilters} onRemove={onChange} onClearAll={onReset} />}
    </div>
  );
}
