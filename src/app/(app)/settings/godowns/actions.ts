"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, saveGodown, deleteGodown } from "@/lib/data";
import type { Godown } from "@/lib/data/types";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type SaveGodownInput = {
  id?: string;
  name: string;
  place: string;
  own: boolean;
  inCharge: string[];
  productIds: string[];
  linkAllProducts: boolean;
};

export async function saveGodownAction(input: SaveGodownInput): Promise<{ ok: boolean; godown?: Godown; error?: string }> {
  const user = await getCurrentUser();
  if (user.role !== "owner" && user.role !== "office") {
    return { ok: false, error: "Only the owner or office staff can manage godowns." };
  }

  const name = input.name.trim();
  const place = input.place.trim();
  if (!name) return { ok: false, error: "Godown name is required." };
  if (!place) return { ok: false, error: "Place / location is required." };

  const id = input.id?.trim() || `g-${slugify(name)}-${Date.now().toString(36)}`;

  const godown: Godown = {
    id,
    name,
    place,
    own: Boolean(input.own),
    inCharge: Array.isArray(input.inCharge) ? input.inCharge : [],
    productIds: Array.isArray(input.productIds) ? input.productIds : [],
    linkAllProducts: Boolean(input.linkAllProducts),
    original: true,
  };

  try {
    const saved = await saveGodown(godown);
    revalidatePath("/settings/godowns");
    revalidatePath("/sales/new");
    revalidatePath("/purchases/new");
    revalidatePath("/orders/new");
    revalidatePath("/stock");
    return { ok: true, godown: saved };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save godown.";
    return { ok: false, error: message };
  }
}

export async function deleteGodownAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (user.role !== "owner" && user.role !== "office") {
    return { ok: false, error: "Only the owner or office staff can delete godowns." };
  }

  try {
    const problem = await deleteGodown(id);
    if (problem) {
      return { ok: false, error: problem };
    }
    revalidatePath("/settings/godowns");
    revalidatePath("/sales/new");
    revalidatePath("/purchases/new");
    revalidatePath("/orders/new");
    revalidatePath("/stock");
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete godown.";
    return { ok: false, error: message };
  }
}
