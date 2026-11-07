"use client";

import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { deleteSaleAction } from "../actions";

export function DeleteSaleButton({
  saleId,
  what,
  compact = false,
  className,
}: {
  saleId: string;
  what: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <ConfirmDelete
      what={what}
      compact={compact}
      after="/sales"
      className={className}
      label="Delete this sale"
      onDelete={async () => {
        const res = await deleteSaleAction(saleId);
        if (!res.ok) {
          return { ok: false, problem: res.error || "Cannot delete sale" };
        }
        return { ok: true };
      }}
    />
  );
}
