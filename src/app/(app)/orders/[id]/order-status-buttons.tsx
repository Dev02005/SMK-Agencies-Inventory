"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { updateOrderStatusAction } from "../actions";

export function ConfirmOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    const result = await updateOrderStatusAction(orderId, "confirmed");
    setLoading(false);
    if (!result.ok) {
      toast(result.error ?? "Failed to confirm order");
      return;
    }
    toast("Order confirmed and godown notified to set stock aside");
    router.refresh();
  }

  return (
    <Button disabled={loading} onClick={handleConfirm}>
      {loading ? "Confirming…" : "Confirm order"}
    </Button>
  );
}

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    setLoading(true);
    const result = await updateOrderStatusAction(orderId, "cancelled");
    setLoading(false);
    if (!result.ok) {
      toast(result.error ?? "Failed to cancel order");
      return;
    }
    toast("Order cancelled");
    router.refresh();
  }

  return (
    <Button
      variant="plain"
      className="mt-3 text-danger hover:bg-danger-soft/30 hover:underline"
      disabled={loading}
      onClick={handleCancel}
    >
      {loading ? "Cancelling…" : "Cancel order"}
    </Button>
  );
}
