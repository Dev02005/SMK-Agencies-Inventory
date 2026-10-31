"use client";

import Link from "next/link";
import { useState } from "react";
import { StatCard, StatRow } from "@/components/ui/blocks";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { FilterChips } from "@/components/ui/filters";
import { cn } from "@/lib/cn";
import type { TourVisit, VisitPurpose, VisitStatus } from "@/lib/data/types";
import { formatDate } from "@/lib/format";

type Visit = TourVisit & { staffName: string; partyName: string };

const purposeLabel: Record<VisitPurpose, string> = { collection: "Collection", order: "Order", new_party: "New party", complaint: "Complaint" };
const statusTone: Record<VisitStatus, ChipTone> = { planned: "accent", completed: "good", postponed: "warning", cancelled: "danger" };

/** Visits grouped by day: last week (with outcomes), today, and the plan for the coming days. */
export function ToursBoard({ visits, staff, today }: { visits: Visit[]; staff: { id: string; name: string }[]; today: string }) {
  const [who, setWho] = useState<string>("all");
  const [when, setWhen] = useState<"past" | "upcoming">("upcoming");

  const mine = visits.filter((v) => who === "all" || v.profileId === who);
  const shown = mine.filter((v) => (when === "upcoming" ? v.date >= today : v.date < today));
  const days = [...new Set(shown.map((v) => v.date))].sort((a, b) => (when === "upcoming" ? a.localeCompare(b) : b.localeCompare(a)));
  const done = mine.filter((v) => v.date <= today && v.status !== "planned");

  return (
    <div className="space-y-4">
      <StatRow>
        <StatCard label="Visits done (last 7 days)" value={done.filter((v) => v.status === "completed").length} tone="good" hint={`of ${done.length} planned`} />
        <StatCard label="Postponed or cancelled" value={done.filter((v) => v.status !== "completed").length} tone="warning" />
        <StatCard label="Planned ahead" value={mine.filter((v) => v.status === "planned").length} />
      </StatRow>

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
        <FilterChips
          label="Staff"
          value={who}
          onChange={setWho}
          options={[{ value: "all", label: "Everyone" }, ...staff.map((s) => ({ value: s.id, label: s.name }))]}
        />
        <FilterChips
          label="When"
          value={when}
          onChange={setWhen}
          options={[
            { value: "upcoming", label: "Today and ahead" },
            { value: "past", label: "Last 7 days" },
          ]}
        />
      </div>

      {days.map((day) => (
        <section key={day} className="surface p-5">
          <h2 className={cn("text-[17px] font-semibold tracking-[-0.3px]", day === today ? "text-accent" : "text-ink")}>
            {day === today ? "Today · " : ""}
            {formatDate(day)}
          </h2>
          <ul className="mt-2 divide-y divide-hairline">
            {shown
              .filter((v) => v.date === day)
              .map((v) => (
                <li key={v.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] text-ink">
                      {v.partyId ? (
                        <Link href={`/parties/${v.partyId}`} className="hover:text-link hover:underline">
                          {v.partyName}
                        </Link>
                      ) : (
                        v.partyName
                      )}
                    </p>
                    <p className="text-[13px] text-ink-secondary">
                      {v.place} · {purposeLabel[v.purpose]}
                      {who === "all" && ` · ${v.staffName}`}
                    </p>
                    {v.outcome && <p className="mt-0.5 text-[13px] text-ink">{v.outcome}</p>}
                    {v.nextAction && <p className="text-[12px] text-ink-tertiary">Next: {v.nextAction}</p>}
                  </div>
                  <Chip tone={statusTone[v.status]}>{v.status}</Chip>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
