"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import { FilterChips } from "@/components/ui/filters";
import { defaultPresets, presetLabels, resolveDateFilter, withDateFilter, type DateFilter, type DatePreset } from "@/lib/date-filter";
import { addDaysISO, todayISO } from "@/lib/format";

/** The date filter in the address, for lists that filter in the browser. */
export function useDateFilter(presets: DatePreset[] = defaultPresets): DateFilter {
  return resolveDateFilter(useSearchParams(), todayISO(), presets);
}

type Choice = DatePreset | "day" | "range";

/**
 * All dates · Today · Last 7 days · This month · Pick a day · From – to. The choice goes into the address
 * (see lib/date-filter), so the page and its download both follow it.
 */
export function DateFilterBar({ presets = defaultPresets }: { presets?: DatePreset[] }) {
  return (
    <Suspense fallback={<Chips presets={presets} value={presets[0]} onChange={() => {}} />}>
      <LiveDateFilter presets={presets} />
    </Suspense>
  );
}

function Chips({ presets, value, onChange }: { presets: DatePreset[]; value: Choice; onChange: (choice: Choice) => void }) {
  return (
    <FilterChips<Choice>
      label="Dates"
      value={value}
      onChange={onChange}
      options={[...presets.map((p) => ({ value: p, label: presetLabels[p] })), { value: "day", label: "Pick a day" }, { value: "range", label: "From – to" }]}
    />
  );
}

function LiveDateFilter({ presets }: { presets: DatePreset[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const today = todayISO();
  const filter = resolveDateFilter(params, today, presets);

  const go = (choice: Parameters<typeof withDateFilter>[1]) => {
    const query = withDateFilter(new URLSearchParams(params.toString()), choice, presets[0]).toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const pick = (choice: Choice) => {
    if (choice === "day") go({ on: filter.kind === "day" ? filter.from : today });
    else if (choice === "range") go({ from: filter.from || addDaysISO(today, -6), to: filter.to || today });
    else go({ preset: choice });
  };

  return (
    <div className="min-w-0 space-y-2">
      <Chips presets={presets} value={filter.kind} onChange={pick} />
      {filter.kind === "day" && (
        <div className="flex items-center gap-2 text-[14px] text-ink-secondary">
          Day
          <div className="w-44">
            <DatePicker size="pill" label="Day" value={filter.from} onChange={(on) => on && go({ on })} />
          </div>
        </div>
      )}
      {filter.kind === "range" && (
        <div className="flex flex-wrap items-center gap-2 text-[14px] text-ink-secondary">
          <div className="flex items-center gap-2">
            From
            <div className="w-44">
              <DatePicker size="pill" label="From" value={filter.from} max={filter.to || undefined} onChange={(from) => go({ from, to: filter.to })} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            to
            <div className="w-44">
              <DatePicker size="pill" label="To" value={filter.to} min={filter.from || undefined} onChange={(to) => go({ from: filter.from, to })} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
