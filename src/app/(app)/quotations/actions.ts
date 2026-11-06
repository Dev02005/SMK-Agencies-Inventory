"use server";

import { revalidatePath } from "next/cache";
import { addQuotation, type Quotation } from "@/lib/data";

export async function createQuotationAction(input: Omit<Quotation, "id">) {
  try {
    const quotation = await addQuotation(input);
    revalidatePath("/quotations");
    return { ok: true as const, quotation };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Failed to save quotation" };
  }
}
