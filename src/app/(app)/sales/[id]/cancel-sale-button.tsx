"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { rejectSaleAction } from "../actions";

export function CancelSaleButton({ saleId, billNo }: { saleId: string; billNo?: number }) {
  const router = useRouter();
  const toast = useToast();
  const [cancelling, setCancelling] = useState(false);

  async function handleCancel() {
    const promptText = billNo ? `Cancel Bill #${billNo}? Enter a reason:` : "Cancel this sale request? Enter a reason:";
    const reason = window.prompt(promptText, "Customer cancelled order");
    if (reason === null) return; // User pressed Cancel in prompt
    setCancelling(true);
    const result = await rejectSaleAction(saleId, reason || "Cancelled by owner");
    setCancelling(false);
    if (!result.ok) {
      toast(result.error ?? "Failed to cancel bill");
      return;
    }
    toast(billNo ? `Bill #${billNo} has been cancelled and stock restored.` : "Sale request has been cancelled.");
    router.refresh();
  }

  return (
    <Button
      variant="plain"
      className="mt-3 text-danger hover:bg-danger-soft/30 hover:underline"
      disabled={cancelling}
      onClick={handleCancel}
    >
      {cancelling ? "Cancelling…" : billNo ? "Cancel this bill" : "Cancel this sale request"}
    </Button>
  );
}
