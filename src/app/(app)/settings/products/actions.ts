"use server";

import { addProduct, clearAllStandardProducts, deleteProduct, getCurrentUser, getProducts } from "@/lib/data";
import type { Product } from "@/lib/data/types";

export type ProductResult = { ok: true } | { ok: false; problem: string };
export type CreateProductResult = { ok: true; product: Product } | { ok: false; problem: string };

const canEdit = async () => {
  const user = await getCurrentUser();
  return user.role === "owner" || user.role === "office";
};

/** A new product: cement, steel, or any custom product item. Products have no fixed rate. */
export async function createProduct(input: {
  brand: string;
  variant: string;
  category?: string;
  unit?: string;
  image?: string;
}): Promise<CreateProductResult> {
  if (!(await canEdit())) return { ok: false, problem: "Only the owner and the office can add products." };
  const brand = typeof input?.brand === "string" ? input.brand.trim().replace(/\s+/g, " ") : "";
  const variant = typeof input?.variant === "string" ? input.variant.trim().replace(/\s+/g, " ") : "";
  const rawCategory = typeof input?.category === "string" ? input.category.trim() : "";
  const category = rawCategory.toLowerCase() === "cement" ? "cement" : rawCategory.toLowerCase() === "steel" ? "steel" : (rawCategory || "General");
  const defaultUnit = category === "cement" ? "bag" : category === "steel" ? "kg" : "piece";
  const unit = typeof input?.unit === "string" && input.unit.trim() ? input.unit.trim().toLowerCase() : defaultUnit;
  const image = typeof input?.image === "string" && input.image.startsWith("data:image/") ? input.image : undefined;

  if (!brand || brand.length > 50) return { ok: false, problem: "Enter the brand or manufacturer." };
  if (!variant || variant.length > 50) return { ok: false, problem: "Enter the item name or description." };
  const name = `${brand} ${variant}`.toLowerCase();
  if ((await getProducts()).some((p) => p.name.toLowerCase() === name)) return { ok: false, problem: "That product is already in the list." };
  const product = await addProduct({ brand, variant, category, unit, image });
  return { ok: true, product };
}

/** Deletes a product from the catalog. */
export async function removeProduct(id: string): Promise<ProductResult> {
  if (!(await canEdit())) return { ok: false, problem: "Only the owner and the office can delete products." };
  const problem = await deleteProduct(String(id));
  if (problem) return { ok: false, problem };
  return { ok: true };
}

/** Clears all pre-loaded standard cement & steel items from the catalog. */
export async function clearStandardProductsAction(): Promise<ProductResult> {
  if (!(await canEdit())) return { ok: false, problem: "Only the owner and the office can manage products." };
  await clearAllStandardProducts();
  return { ok: true };
}
