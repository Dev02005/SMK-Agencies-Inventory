"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { SampleTag } from "@/components/ui/blocks";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import type { Product } from "@/lib/data/types";
import { createProduct, removeProduct } from "./actions";

/** Each product grouped by brand. No rates: the owner puts the price on each bill. */
export function ProductList({ products }: { products: Product[] }) {
  const brands = [...new Set(products.map((p) => p.brand))];
  return (
    <div className="space-y-4">
      {brands.map((brand) => (
        <section key={brand} className="surface p-5">
          <h2 className="mb-1 flex items-center gap-2.5 text-[17px] font-semibold tracking-[-0.3px] text-ink before:block before:h-[18px] before:w-1 before:rounded-full before:bg-[linear-gradient(180deg,var(--accent),var(--teal))]">
            {brand}
          </h2>
          <ul className="divide-y divide-hairline">
            {products
              .filter((p) => p.brand === brand)
              .map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <span className="text-[15px] text-ink">
                    {p.variant ?? p.name}
                    <SampleTag record={p} />
                  </span>
                  <span className="flex items-center gap-2 text-[13px] text-ink-secondary">
                    {p.unit === "bag" ? "Sold by the bag" : "Sold by the kg"}
                    {p.original && <ConfirmDelete what={p.name} onDelete={() => removeProduct(p.id)} compact />}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Adds a product: a company's cement type (sold by the bag) or a steel item (by the kg). */
export function AddProduct({ brands }: { brands: string[] }) {
  const id = useId();
  const router = useRouter();
  const toast = useToast();
  const [category, setCategory] = useState<"cement" | "steel">("cement");
  const [brand, setBrand] = useState("");
  const [variant, setVariant] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setProblem(null);
        startTransition(async () => {
          const result = await createProduct({ brand, variant, category });
          if (!result.ok) {
            setProblem(result.problem);
            return;
          }
          toast(`${brand.trim()} ${variant.trim()} added`);
          setVariant("");
          router.refresh();
        });
      }}
    >
      <Segmented
        label="Cement or steel"
        value={category}
        onChange={setCategory}
        options={[
          { value: "cement", label: "Cement (bags)" },
          { value: "steel", label: "Steel (kg)" },
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Brand" htmlFor={`${id}-brand`} hint={brands.length ? `e.g. ${brands.slice(0, 2).join(", ")}` : undefined}>
          <input id={`${id}-brand`} className={inputClass} value={brand} onChange={(e) => setBrand(e.target.value)} maxLength={40} autoCapitalize="words" />
        </Field>
        <Field label="Type" htmlFor={`${id}-variant`} hint="e.g. PPC, OPC, TMT 8 mm">
          <input id={`${id}-variant`} className={inputClass} value={variant} onChange={(e) => setVariant(e.target.value)} maxLength={40} />
        </Field>
      </div>
      {problem && (
        <p role="alert" className="text-[13px] text-danger">
          {problem}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending || !brand.trim() || !variant.trim()}>
          {pending ? "Adding…" : "Add product"}
        </Button>
      </div>
    </form>
  );
}
