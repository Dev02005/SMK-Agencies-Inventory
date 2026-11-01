"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { SimpleForm } from "@/components/forms/simple-form";
import { SectionCard } from "@/components/ui/blocks";
import { Button } from "@/components/ui/button";

/** "Add firm": a blank firm form under the existing ones. */
export function AddFirm({ next }: { next: number }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button variant="secondary" className="w-full sm:w-auto" onClick={() => setOpen(true)}>
        <Plus size={18} strokeWidth={2} aria-hidden /> Add firm
      </Button>
    );
  }
  return (
    <SectionCard
      title={`New firm (Firm ${next})`}
      action={
        <Button variant="plain" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      }
    >
      <SimpleForm
        thing="firm"
        submitLabel="Add firm"
        fields={[
          { name: "name", label: "Firm name", required: true, wide: true },
          { name: "gstin", label: "GSTIN" },
          { name: "phone", label: "Phone", prefix: "+91" },
          { name: "address", label: "Address", required: true, wide: true },
        ]}
      />
    </SectionCard>
  );
}
