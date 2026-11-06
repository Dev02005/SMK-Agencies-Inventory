"use server";

import { revalidatePath } from "next/cache";
import { addOrder, updateOrderStatus, type Order, type OrderStatus } from "@/lib/data";

export async function createOrderAction(input: Omit<Order, "id" | "orderNo">) {
  try {
    const order = await addOrder(input);
    revalidatePath("/orders");
    revalidatePath("/dashboard");
    return { ok: true as const, order };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Failed to save order" };
  }
}

export async function updateOrderStatusAction(orderId: string, status: OrderStatus) {
  try {
    const order = await updateOrderStatus(orderId, status);
    revalidatePath("/orders");
    revalidatePath(`/orders/${orderId}`);
    return { ok: true as const, order };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Failed to update order" };
  }
}
