"use server";

import { updateTag } from "next/cache";
import { addProduct, getCurrentUser, getProducts, PRODUCTS_TAG, setProductRate } from "@/lib/data";

export type ProductResult = { ok: true } | { ok: false; problem: string };

const canEdit = async () => {
  const user = await getCurrentUser();
  return user.role === "owner" || user.role === "office";
};

const rateProblem = (rate: unknown) => (typeof rate !== "number" || !Number.isFinite(rate) || rate < 0 || rate > 1_000_000 ? "Enter the list rate in rupees." : null);

/** A new list rate for one product. */
export async function saveRate(id: string, listRate: number): Promise<ProductResult> {
  if (!(await canEdit())) return { ok: false, problem: "Only the owner and the office can change rates." };
  const problem = rateProblem(listRate);
  if (problem) return { ok: false, problem };
  if (!(await setProductRate(String(id), Math.round(listRate * 100) / 100))) return { ok: false, problem: "That product is no longer there. Reload the page." };
  updateTag(PRODUCTS_TAG);
  return { ok: true };
}

/** A new product: a company's cement type (sold by the bag) or a steel item (by the kg). */
export async function createProduct(input: { brand: string; variant: string; category: "cement" | "steel"; listRate: number }): Promise<ProductResult> {
  if (!(await canEdit())) return { ok: false, problem: "Only the owner and the office can add products." };
  const brand = typeof input?.brand === "string" ? input.brand.trim().replace(/\s+/g, " ") : "";
  const variant = typeof input?.variant === "string" ? input.variant.trim().replace(/\s+/g, " ") : "";
  if (!brand || brand.length > 40) return { ok: false, problem: "Enter the brand, e.g. UltraTech." };
  if (!variant || variant.length > 40) return { ok: false, problem: "Enter the type, e.g. PPC." };
  const problem = rateProblem(input.listRate);
  if (problem) return { ok: false, problem };
  const name = `${brand} ${variant}`.toLowerCase();
  if ((await getProducts()).some((p) => p.name.toLowerCase() === name)) return { ok: false, problem: "That product is already in the list." };
  await addProduct({ brand, variant, category: input.category === "steel" ? "steel" : "cement", listRate: input.listRate });
  updateTag(PRODUCTS_TAG);
  return { ok: true };
}
