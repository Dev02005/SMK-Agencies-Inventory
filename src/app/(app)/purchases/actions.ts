"use server";

import { revalidatePath } from "next/cache";
import { addPurchase, deletePurchase, type AddPurchaseInput } from "@/lib/data";

export async function createPurchaseAction(input: AddPurchaseInput) {
  try {
    const purchase = await addPurchase(input);
    revalidatePath("/purchases");
    revalidatePath("/purchases/new");
    revalidatePath("/purchases", "layout");
    revalidatePath("/stock");
    revalidatePath("/dashboard");
    return { ok: true as const, purchase };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Failed to save purchase",
    };
  }
}

export async function deletePurchaseAction(purchaseId: string) {
  try {
    const success = await deletePurchase(purchaseId);
    if (!success) {
      return { ok: false as const, error: "Purchase not found" };
    }
    revalidatePath("/purchases");
    revalidatePath(`/purchases/${purchaseId}`);
    revalidatePath("/purchases/new");
    revalidatePath("/purchases", "layout");
    revalidatePath("/stock");
    revalidatePath("/reports");
    revalidatePath("/dashboard");
    return { ok: true as const };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Failed to delete purchase",
    };
  }
}
