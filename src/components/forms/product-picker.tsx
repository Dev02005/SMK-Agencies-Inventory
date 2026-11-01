"use client";

import { useId } from "react";
import { Field } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import type { Product } from "@/lib/data/types";
import { categoryLabels, variantOf } from "@/lib/product-options";

/**
 * Picks an item the way it is talked about: cement or steel first, then the brand, then the type (variant).
 * Changing the category or brand moves to the first type under it.
 */
export function ProductPicker({ label, products, value, onChange }: { label: string; products: Product[]; value: string; onChange: (productId: string) => void }) {
  const id = useId();
  const current = products.find((p) => p.id === value) ?? products[0];
  const categories = [...new Set(products.map((p) => p.category))];
  const brands = [...new Set(products.filter((p) => p.category === current.category).map((p) => p.brand))];
  const types = products.filter((p) => p.category === current.category && p.brand === current.brand);
  const firstOf = (category: Product["category"], brand?: string) => products.find((p) => p.category === category && (!brand || p.brand === brand)) ?? current;

  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className="mb-1.5 text-[13px] text-ink-secondary">{label}</legend>
      {categories.length > 1 && (
        <Segmented
          label={`${label}: cement or steel`}
          value={current.category}
          onChange={(category) => onChange(firstOf(category).id)}
          options={categories.map((c) => ({ value: c, label: categoryLabels[c] }))}
        />
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Brand" htmlFor={`${id}-brand`}>
          <Select
            id={`${id}-brand`}
            label="Brand"
            value={current.brand}
            onChange={(brand) => onChange(firstOf(current.category, brand).id)}
            options={brands.map((b) => ({ value: b, label: b }))}
          />
        </Field>
        <Field label="Type" htmlFor={`${id}-type`}>
          <Select id={`${id}-type`} label="Type" value={current.id} onChange={onChange} options={types.map((p) => ({ value: p.id, label: variantOf(p) }))} />
        </Field>
      </div>
    </fieldset>
  );
}
