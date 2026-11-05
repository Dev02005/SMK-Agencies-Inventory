"use client";

import { useId, useState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import type { Product } from "@/lib/data/types";
import { categoryLabels, variantOf } from "@/lib/product-options";

/**
 * Picks an item the way it is talked about: category first, then the brand, then the type (variant).
 * Changing the category or brand moves to the first type under it.
 */
export function ProductPicker({
  label,
  products,
  value,
  onChange,
  allowNew,
  onCreated,
}: {
  label: string;
  products: Product[];
  value: string;
  onChange: (productId: string) => void;
  allowNew?: boolean;
  onCreated?: (product: Product) => void;
}) {
  const id = useId();
  const [showNew, setShowNew] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newVariant, setNewVariant] = useState("");
  const [newUnit, setNewUnit] = useState("piece");

  const current = products.find((p) => p.id === value) ?? products[0];
  if (!current) {
    return (
      <div className="rounded-xl border border-dashed border-divider p-3 text-[13px] text-ink-secondary">
        <p>No products available in this godown or catalog.</p>
        {allowNew && onCreated && (
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="mt-1 font-medium text-accent hover:underline"
          >
            + Add item
          </button>
        )}
      </div>
    );
  }

  const categories = [...new Set(products.map((p) => p.category))];
  const brands = [...new Set(products.filter((p) => p.category === current.category).map((p) => p.brand))];
  const types = products.filter((p) => p.category === current.category && p.brand === current.brand);
  const firstOf = (category: Product["category"], brand?: string) => products.find((p) => p.category === category && (!brand || p.brand === brand)) ?? current;

  const getCategoryLabel = (c: string) => categoryLabels[c] || (c ? c.charAt(0).toUpperCase() + c.slice(1) : "Other");

  return (
    <fieldset className="min-w-0 space-y-3">
      {allowNew && onCreated ? (
        <div className="flex items-center justify-between">
          <legend className="mb-1.5 text-[13px] text-ink-secondary">{label}</legend>
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            className="text-[12px] font-medium text-accent hover:underline"
          >
            {showNew ? "Cancel" : "+ New item"}
          </button>
        </div>
      ) : (
        <legend className="mb-1.5 text-[13px] text-ink-secondary">{label}</legend>
      )}

      {showNew && allowNew && onCreated && (
        <div className="space-y-2 rounded-xl bg-card-subtle/80 p-3 border border-hairline">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Category" htmlFor={`${id}-nc`}>
              <input
                id={`${id}-nc`}
                className={inputClass}
                placeholder="e.g. Cement, Steel, Paints"
                value={newCategory || getCategoryLabel(current.category)}
                onChange={(e) => setNewCategory(e.target.value)}
              />
            </Field>
            <Field label="Brand / Make" htmlFor={`${id}-nb`}>
              <input
                id={`${id}-nb`}
                className={inputClass}
                placeholder="e.g. Asian Paints, Deccan"
                value={newBrand}
                onChange={(e) => setNewBrand(e.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Item name / Type" htmlFor={`${id}-nv`}>
              <input
                id={`${id}-nv`}
                className={inputClass}
                placeholder="e.g. PPC, 12mm Bar, Primer"
                value={newVariant}
                onChange={(e) => setNewVariant(e.target.value)}
              />
            </Field>
            <Field label="Unit" htmlFor={`${id}-nu`}>
              <input
                id={`${id}-nu`}
                className={inputClass}
                placeholder="e.g. bag, kg, bar, litre, piece"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
              />
            </Field>
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="button"
              disabled={!newBrand.trim() || !newVariant.trim()}
              onClick={() => {
                const effectiveCat = (newCategory.trim() || current.category || "General").toLowerCase();
                const item: Product = {
                  id: `p-${Date.now()}`,
                  name: `${newBrand.trim()} ${newVariant.trim()}`,
                  brand: newBrand.trim(),
                  variant: newVariant.trim(),
                  category: effectiveCat,
                  unit: newUnit.trim().toLowerCase() || "piece",
                  active: true,
                  original: true,
                };
                onCreated(item);
                onChange(item.id);
                setNewBrand("");
                setNewVariant("");
                setNewCategory("");
                setShowNew(false);
              }}
              className="rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-white hover:bg-accent/90 disabled:opacity-50"
            >
              Add to bill
            </button>
          </div>
        </div>
      )}

      {categories.length > 1 ? (
        categories.length <= 4 ? (
          <Segmented
            label={`${label}: category`}
            value={current.category}
            onChange={(category) => onChange(firstOf(category).id)}
            options={categories.map((c) => ({ value: c, label: getCategoryLabel(c) }))}
          />
        ) : (
          <Field label="Category" htmlFor={`${id}-cat`}>
            <Select
              id={`${id}-cat`}
              label="Category"
              value={current.category}
              onChange={(category) => onChange(firstOf(category).id)}
              options={categories.map((c) => ({ value: c, label: getCategoryLabel(c) }))}
            />
          </Field>
        )
      ) : (
        <div className="flex items-center gap-1.5 text-[12px] text-ink-secondary">
          <span>Category:</span>
          <span className="rounded-md bg-accent-soft px-2 py-0.5 font-semibold text-accent capitalize">
            {getCategoryLabel(current.category)}
          </span>
        </div>
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
