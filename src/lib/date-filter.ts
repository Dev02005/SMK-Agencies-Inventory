import { addDaysISO, formatDate, formatMonth } from "@/lib/format";

/**
 * The date filter every list shares. It lives in the page address so server pages and browser lists read the same
 * thing, and a filtered list can be shared or reopened:
 *   ?dates=today | 7d | month | all   a quick choice, counted from today
 *   ?on=2026-10-30                    one day
 *   ?from=2026-10-01&to=2026-10-15    day A to day B (either end may be left open)
 * With none of these, the page's first quick choice applies ("all" unless the page says otherwise).
 */
export type DatePreset = "all" | "today" | "7d" | "month";

/**
 * For the sales lists: Today first, so the page (and what it prints or downloads) is the day's sales unless another
 * choice is picked; printing on 5 Nov gives 5 Nov.
 */
export const salesPresets: DatePreset[] = ["today", "all", "7d", "month"];

export const presetLabels: Record<DatePreset, string> = { all: "All dates", today: "Today", "7d": "Last 7 days", month: "This month" };

export const defaultPresets: DatePreset[] = ["all", "today", "7d", "month"];

export type DateFilter = {
  kind: DatePreset | "day" | "range";
  /** YYYY-MM-DD, or "" for no lower limit. */
  from: string;
  /** YYYY-MM-DD, or "" for no upper limit. */
  to: string;
  /** "All dates", "1 Nov 2026", "25 Oct 2026 – 1 Nov 2026"… for headings and downloads. */
  label: string;
};

type Params = URLSearchParams | Record<string, string | string[] | undefined>;

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

function read(params: Params, key: string) {
  const value = params instanceof URLSearchParams ? params.get(key) : params[key];
  return typeof value === "string" ? value : undefined;
}

function dateParam(params: Params, key: string) {
  const value = read(params, key);
  return value && isoDate.test(value) ? value : undefined;
}

function presetFilter(preset: DatePreset, today: string): DateFilter {
  if (preset === "today") return { kind: preset, from: today, to: today, label: `Today, ${formatDate(today)}` };
  if (preset === "7d") {
    const from = addDaysISO(today, -6);
    return { kind: preset, from, to: today, label: `${formatDate(from)} – ${formatDate(today)}` };
  }
  if (preset === "month") return { kind: preset, from: `${today.slice(0, 7)}-01`, to: today, label: formatMonth(today.slice(0, 7)) };
  return { kind: "all", from: "", to: "", label: presetLabels.all };
}

function rangeLabel(from: string, to: string) {
  if (from && to) return from === to ? formatDate(from) : `${formatDate(from)} – ${formatDate(to)}`;
  if (from) return `From ${formatDate(from)}`;
  if (to) return `Up to ${formatDate(to)}`;
  return presetLabels.all;
}

/** The filter asked for in the address; `presets` are the quick choices this page offers, the first being its default. */
export function resolveDateFilter(params: Params, today: string, presets: DatePreset[] = defaultPresets): DateFilter {
  const on = dateParam(params, "on");
  if (on) return { kind: "day", from: on, to: on, label: formatDate(on) };
  let from = dateParam(params, "from") ?? "";
  let to = dateParam(params, "to") ?? "";
  if (from || to) {
    if (from && to && from > to) [from, to] = [to, from];
    return { kind: "range", from, to, label: rangeLabel(from, to) };
  }
  const asked = read(params, "dates");
  return presetFilter(presets.find((p) => p === asked) ?? presets[0] ?? "all", today);
}

/** Calendar day in India for a "YYYY-MM-DD" date or a full timestamp. */
function dayOf(date: string) {
  if (date.length <= 10) return date;
  const at = new Date(date);
  return Number.isNaN(at.getTime()) ? date.slice(0, 10) : new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(at);
}

/** Is this date inside the filter? Rows without a date only show under "All dates". */
export function inDateFilter(date: string | undefined | null, filter: DateFilter) {
  if (!filter.from && !filter.to) return true;
  if (!date) return false;
  const day = dayOf(date);
  return (!filter.from || day >= filter.from) && (!filter.to || day <= filter.to);
}

/** Search params for a filter choice, keeping the page's other params (status, search…). */
export function withDateFilter(current: URLSearchParams, choice: { preset: DatePreset } | { on: string } | { from: string; to: string }, defaultPreset: DatePreset) {
  const next = new URLSearchParams(current);
  for (const key of ["dates", "on", "from", "to"]) next.delete(key);
  if ("preset" in choice) {
    if (choice.preset !== defaultPreset) next.set("dates", choice.preset);
  } else if ("on" in choice) {
    next.set("on", choice.on);
  } else {
    if (choice.from) next.set("from", choice.from);
    if (choice.to) next.set("to", choice.to);
  }
  return next;
}
