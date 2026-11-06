import {
  anyFilterValue,
  customDateValue,
  queueDatePresetDays,
  queueDatePresetLabels,
  queueDatePresets,
  type QueueDatePreset,
} from "@/constants/queue";
import { formatDate } from "@/lib/format";

export type DateSelection = QueueDatePreset | typeof anyFilterValue | typeof customDateValue;

/** Local calendar date as YYYY-MM-DD (what <input type="date"> and the API's from/to use). */
export function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function daysAgo(days: number, today: Date): string {
  const d = new Date(today);
  d.setDate(d.getDate() - days);
  return toIsoDate(d);
}

/** Presets are open-ended ("since N days ago"), so they always include today's newest tickets. */
export function presetRange(preset: QueueDatePreset, today = new Date()): { from: string; to: null } {
  return { from: daysAgo(queueDatePresetDays[preset], today), to: null };
}

/** Which dropdown option a from/to pair corresponds to (anything else is a custom range). */
export function matchDateSelection(from: string | null, to: string | null, today = new Date()): DateSelection {
  if (!from && !to) return anyFilterValue;
  if (!to) {
    const preset = queueDatePresets.find((p) => presetRange(p, today).from === from);
    if (preset) return preset;
  }
  return customDateValue;
}

/** Human label for the active-filter pill, e.g. "Last 7 days" or "5 Nov 2026 – 6 Nov 2026". */
export function describeDateRange(from: string | null, to: string | null, today = new Date()): string {
  const selection = matchDateSelection(from, to, today);
  if (selection !== anyFilterValue && selection !== customDateValue) return queueDatePresetLabels[selection];
  if (from && to) return `${formatDate(from)} – ${formatDate(to)}`;
  if (from) return `Since ${formatDate(from)}`;
  if (to) return `Until ${formatDate(to)}`;
  return "";
}
