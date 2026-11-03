"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { SectionCard } from "@/components/ui/blocks";
import { IconButton } from "@/components/ui/button";
import { ConfirmDelete, type DeleteResult } from "@/components/ui/confirm-delete";
import { inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

type AddResult = { ok: true; name: string; added: boolean } | { ok: false; problem: string };

/** One saved list: each name with a bin to delete it, and a box to add a new one. */
export function SavedList({
  title,
  items,
  noun,
  placeholder,
  onAdd,
  onDelete,
}: {
  title: string;
  items: string[];
  noun: string;
  placeholder: string;
  onAdd: (name: string) => Promise<AddResult>;
  onDelete: (name: string) => Promise<DeleteResult>;
}) {
  const id = useId();
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  function add() {
    if (!name.trim() || pending) return;
    startTransition(async () => {
      const result = await onAdd(name);
      if (!result.ok) {
        toast(result.problem);
        return;
      }
      toast(result.added ? `${result.name} added` : `${result.name} is already in the list`);
      setName("");
      router.refresh();
    });
  }

  return (
    <SectionCard title={`${title} · ${items.length}`}>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <label htmlFor={`${id}-new`} className="sr-only">
          New {noun}
        </label>
        <input id={`${id}-new`} className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder={placeholder} autoCapitalize="words" />
        <IconButton label={`Add ${noun}`} variant="primary" type="submit" disabled={!name.trim() || pending}>
          <Plus size={20} strokeWidth={2} aria-hidden />
        </IconButton>
      </form>
      {items.length === 0 ? (
        <p className="mt-3 text-[14px] text-ink-secondary">None yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-hairline">
          {items.map((item) => (
            <li key={item} className="flex items-center justify-between gap-3 py-1.5">
              <span className="text-[15px] text-ink">{item}</span>
              <ConfirmDelete what={item} onDelete={() => onDelete(item)} compact />
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
