"use server";

import { revalidatePath } from "next/cache";
import { addExpense, addPayment, addReceipt, type Expense, type Payment, type Receipt } from "@/lib/data";

export async function createExpenseAction(input: Omit<Expense, "id" | "expenseNo">) {
  try {
    const expense = await addExpense(input);
    revalidatePath("/money");
    revalidatePath("/money/expenses");
    revalidatePath("/dashboard");
    return { ok: true as const, expense };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Failed to record expense" };
  }
}

export async function createReceiptAction(input: Omit<Receipt, "id" | "receiptNo">) {
  try {
    const receipt = await addReceipt(input);
    revalidatePath("/money");
    revalidatePath("/parties");
    revalidatePath("/dashboard");
    return { ok: true as const, receipt };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Failed to record receipt" };
  }
}

export async function createPaymentAction(input: Omit<Payment, "id" | "paymentNo">) {
  try {
    const payment = await addPayment(input);
    revalidatePath("/money");
    revalidatePath("/parties");
    revalidatePath("/dashboard");
    return { ok: true as const, payment };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Failed to record payment" };
  }
}
