"use server";

import { revalidatePath } from "next/cache";
import { addSale, approveSale, rejectSale, type AddSaleInput, type ApproveSaleInput } from "@/lib/data";

export async function createSaleAction(input: AddSaleInput) {
  try {
    const sale = await addSale(input);
    revalidatePath("/sales");
    revalidatePath("/sales/new");
    revalidatePath("/sales", "layout");
    revalidatePath("/stock");
    revalidatePath("/dashboard");
    return { ok: true as const, sale };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Failed to save sale",
    };
  }
}

export async function approveSaleAction(input: ApproveSaleInput) {
  try {
    const sale = await approveSale(input);
    revalidatePath("/sales");
    revalidatePath(`/sales/${input.saleId}`);
    revalidatePath("/sales/new");
    revalidatePath("/sales", "layout");
    revalidatePath("/stock");
    revalidatePath("/dashboard");
    return { ok: true as const, sale };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Failed to approve sale",
    };
  }
}

export async function rejectSaleAction(saleId: string, reason?: string) {
  try {
    const sale = await rejectSale(saleId, reason);
    revalidatePath("/sales");
    revalidatePath(`/sales/${saleId}`);
    revalidatePath("/sales/new");
    revalidatePath("/sales", "layout");
    revalidatePath("/stock");
    revalidatePath("/dashboard");
    return { ok: true as const, sale };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Failed to reject sale",
    };
  }
}
