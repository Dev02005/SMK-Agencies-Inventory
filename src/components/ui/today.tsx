import { Suspense } from "react";
import { getToday } from "@/lib/data";
import { formatDate, formatMonth } from "@/lib/format";

/**
 * Today's date ("Sunday, 1 Nov 2026") or month ("Nov 2026") in India time, for page headers. Read at request time;
 * the header around it shows at once with `fallback` in its place.
 */
export function Today({ as = "date", fallback = as === "date" ? "Today" : "This month" }: { as?: "date" | "month"; fallback?: string }) {
  return (
    <Suspense fallback={fallback}>
      <TodayValue as={as} />
    </Suspense>
  );
}

const weekday = new Intl.DateTimeFormat("en-IN", { weekday: "long", timeZone: "UTC" });

async function TodayValue({ as }: { as: "date" | "month" }) {
  const today = await getToday();
  return as === "date" ? `${weekday.format(new Date(`${today}T00:00:00Z`))}, ${formatDate(today)}` : formatMonth(today.slice(0, 7));
}
