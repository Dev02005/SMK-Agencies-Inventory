"use client";

import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { deletePurchaseAction } from "../actions";

export function DeletePurchaseButton({
  purchaseId,
  what,
  compact = false,
  className,
}: {
  purchaseId: string;
  what: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <ConfirmDelete
      what={what}
      compact={compact}
      after="/purchases"
      className={className}
      label="Delete this purchase"
      onDelete={async () => {
        const res = await deletePurchaseAction(purchaseId);
        if (!res.ok) {
          return { ok: false, problem: res.error || "Cannot delete purchase" };
        }
        return { ok: true };
      }}
    />
  );
}
