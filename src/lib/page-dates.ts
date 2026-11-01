import { getToday } from "@/lib/data";
import { resolveDateFilter, type DatePreset } from "@/lib/date-filter";

/** The date filter a server page was opened with (see lib/date-filter), counted from today in India. */
export async function pageDateFilter(searchParams: Promise<Record<string, string | string[] | undefined>>, presets?: DatePreset[]) {
  const [params, today] = await Promise.all([searchParams, getToday()]);
  return resolveDateFilter(params, today, presets);
}
