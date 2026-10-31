"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { useToast } from "@/components/ui/toast";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { formatBalance } from "@/lib/format";
import { partyKindLabels } from "@/lib/labels";
import type { PartyKind } from "@/lib/data/types";

type PartyRow = { id: string; name: string; place?: string; kind: PartyKind; assignedTo: string; balance: number };

/** Reassign parties between staff; changes are listed before saving and kept in the mapping history. */
export function MappingBoard({ parties, staff }: { parties: PartyRow[]; staff: { id: string; name: string; areas: string[] }[] }) {
  const toast = useToast();
  const [mapping, setMapping] = useState<Record<string, string>>(() => Object.fromEntries(parties.map((p) => [p.id, p.assignedTo])));
  const changed = parties.filter((p) => mapping[p.id] !== p.assignedTo);
  const columns = [...staff.map((s) => ({ id: s.id, title: s.name, sub: s.areas.join(", ") })), { id: "", title: "Office", sub: "No staff member" }];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-ink-secondary">
          {changed.length ? `${changed.length} change${changed.length === 1 ? "" : "s"} not saved yet` : "Change the staff member next to a party to move it."}
        </p>
        <div className="flex gap-2">
          {changed.length > 0 && (
            <Button variant="secondary" onClick={() => setMapping(Object.fromEntries(parties.map((p) => [p.id, p.assignedTo])))}>
              Undo
            </Button>
          )}
          <Button disabled={!changed.length} onClick={() => toast(`Sample mode: ${changed.length} mapping change${changed.length === 1 ? "" : "s"} checked but not stored.`)}>
            Save mapping
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {columns.map((col) => {
          const mine = parties.filter((p) => mapping[p.id] === col.id);
          return (
            <section key={col.id || "office"} className="surface p-5">
              <h2 className="text-[17px] font-semibold tracking-[-0.3px] text-ink">{col.title}</h2>
              <p className="text-[13px] text-ink-secondary">
                {col.sub} · {mine.length} parties
              </p>
              <ul className="mt-3 space-y-2">
                {mine.map((p) => (
                  <li key={p.id} className={cn("rounded-2xl border p-3", mapping[p.id] !== p.assignedTo ? "border-accent bg-accent-soft/40" : "border-hairline")}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[15px] text-ink">{p.name}</p>
                        <p className="text-[12px] text-ink-secondary">
                          {p.place} · {partyKindLabels[p.kind]} · {formatBalance(p.balance)}
                        </p>
                      </div>
                      {mapping[p.id] !== p.assignedTo && <Chip tone="accent">Moved</Chip>}
                    </div>
                    <Select
                      aria-label={`Staff for ${p.name}`}
                      size="sm"
                      className="mt-2"
                      value={mapping[p.id]}
                      onChange={(v) => setMapping((m) => ({ ...m, [p.id]: v }))}
                      options={columns.map((c) => ({ value: c.id, label: c.title }))}
                    />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
