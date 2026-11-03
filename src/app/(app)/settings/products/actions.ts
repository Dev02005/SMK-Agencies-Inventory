"use server";

import { addProduct, deleteProduct, getCurrentUser, getProducts } from "@/lib/data";

export type ProductResult = { ok: true } | { ok: false; problem: string };

const canEdit = async () => {
  const user = await getCurrentUser();
  return user.role === "owner" || user.role === "office";
};

/** A new product: a company's cement type (sold by the bag) or a steel item (by the kg). Products have no rate. */
export async function createProduct(input: { brand: string; variant: string; category: "cement" | "steel" }): Promise<ProductResult> {
  if (!(await canEdit())) return { ok: false, problem: "Only the owner and the office can add products." };
  const brand = typeof input?.brand === "string" ? input.brand.trim().replace(/\s+/g, " ") : "";
  const variant = typeof input?.variant === "string" ? input.variant.trim().replace(/\s+/g, " ") : "";
  if (!brand || brand.length > 40) return { ok: false, problem: "Enter the brand, e.g. UltraTech." };
  if (!variant || variant.length > 40) return { ok: false, problem: "Enter the type, e.g. PPC." };
  const name = `${brand} ${variant}`.toLowerCase();
  if ((await getProducts()).some((p) => p.name.toLowerCase() === name)) return { ok: false, problem: "That product is already in the list." };
  await addProduct({ brand, variant, category: input.category === "steel" ? "steel" : "cement" });
  return { ok: true };
}

/** Deletes a product you added; sample products and products on a saved lorry stay. */
export async function removeProduct(id: string): Promise<ProductResult> {
  if (!(await canEdit())) return { ok: false, problem: "Only the owner and the office can delete products." };
  const problem = await deleteProduct(String(id));
  if (problem) return { ok: false, problem };
  return { ok: true };
}
