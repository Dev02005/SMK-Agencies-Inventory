"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { SectionCard } from "@/components/ui/blocks";
import { IconButton } from "@/components/ui/button";
import { FirmForm } from "./firm-form";

/** "Add firm": a blank firm form under the existing ones. */
export function AddFirm({ next }: { next: number }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <IconButton label="Add firm" onClick={() => setOpen(true)}>
        <Plus size={20} strokeWidth={2} aria-hidden />
      </IconButton>
    );
  }
  return (
    <SectionCard title={`New firm (Firm ${next})`}>
      <FirmForm onDone={() => setOpen(false)} />
    </SectionCard>
  );
}
