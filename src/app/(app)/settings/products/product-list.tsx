"use client";

import {
  Check,
  Layers,
  Package,
  Plus,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import { SampleTag } from "@/components/ui/blocks";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { Field, inputClass } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import type { Product } from "@/lib/data/types";
import { unitLabel } from "@/lib/sales";
import { clearStandardProductsAction, createProduct, removeProduct } from "./actions";

const POPULAR_CATEGORIES = [
  "Cement",
  "Steel",
  "Paints",
  "Pipes & Fittings",
  "Bricks & Blocks",
  "Hardware",
  "Chemicals",
  "Aggregates",
  "Electricals",
  "Roofing",
];

const UNIT_OPTIONS = [
  { value: "kg", label: "Kilograms (kg)" },
  { value: "bar", label: "Bars / Rods (bar)" },
  { value: "bag", label: "Bags (bag)" },
  { value: "mt", label: "Metric Tonnes (MT / Ton)" },
  { value: "piece", label: "Pieces / Nos (pcs)" },
  { value: "bundle", label: "Bundles (bundle)" },
  { value: "box", label: "Boxes / Cartons (box)" },
  { value: "metre", label: "Meters (m)" },
  { value: "sqft", label: "Square feet (sq.ft)" },
  { value: "litre", label: "Litres (L)" },
  { value: "qtl", label: "Quintals (qtl)" },
  { value: "load", label: "Trips / Loads (load)" },
  { value: "custom", label: "Other / Custom unit…" },
];

const QUICK_METRICS = [
  { value: "kg", label: "Kg (Kilograms)" },
  { value: "bar", label: "Bars / Rods" },
  { value: "bag", label: "Bags" },
  { value: "piece", label: "Pieces (Nos)" },
  { value: "mt", label: "MT (Tonnes)" },
  { value: "litre", label: "Litres" },
];

/** Resizes and compresses an uploaded product picture to a small JPEG data URL in the browser. */
async function processProductPhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const maxDim = 320;
  let w = bitmap.width;
  let h = bitmap.height;
  if (w > maxDim || h > maxDim) {
    if (w > h) {
      h = Math.round((h * maxDim) / w);
      w = maxDim;
    } else {
      w = Math.round((w * maxDim) / h);
      h = maxDim;
    }
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}

/** Product Manager: groups items strictly by Category -> Brand -> Types, with custom units and pictures. */
export function ProductList({ products }: { products: Product[] }) {
  const router = useRouter();
  const toast = useToast();
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [preselectedCategory, setPreselectedCategory] = useState<string | undefined>(undefined);
  const [isClearingStandard, setIsClearingStandard] = useState(false);

  // Distinct categories normalized
  const rawCategories = [...new Set(products.map((p) => p.category.trim()))];
  // Sort with Cement and Steel first if present, then alphabetical
  const categories = rawCategories.sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    if (aLower === "cement") return -1;
    if (bLower === "cement") return 1;
    if (aLower === "steel") return -1;
    if (bLower === "steel") return 1;
    return a.localeCompare(b);
  });

  const getCategoryTitle = (c: string) => {
    if (c.toLowerCase() === "cement") return "Cement";
    if (c.toLowerCase() === "steel") return "Steel";
    return c.charAt(0).toUpperCase() + c.slice(1);
  };

  const displayedCategories =
    filterCategory === "all"
      ? categories
      : categories.filter((c) => c.toLowerCase() === filterCategory.toLowerCase());

  const hasStandardProducts = products.some((p) => !p.original);

  async function handleClearStandard(): Promise<{ ok: true } | { ok: false; problem: string }> {
    setIsClearingStandard(true);
    const res = await clearStandardProductsAction();
    setIsClearingStandard(false);
    if (!res.ok) {
      toast(res.problem);
      return res;
    }
    toast("Standard products cleared. Your product list is now clean.");
    router.refresh();
    return { ok: true };
  }

  return (
    <div className="space-y-4">
      {/* Top action bar with Add Item toggle & Clear Standard button */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterCategory("all")}
            className={cn(
              "rounded-full px-3 py-1 text-[13px] font-medium transition-colors",
              filterCategory === "all"
                ? "bg-accent text-white shadow-xs"
                : "bg-card-subtle text-ink-secondary hover:bg-hairline hover:text-ink",
            )}
          >
            All items ({products.length})
          </button>
          {categories.map((cat) => {
            const count = products.filter((p) => p.category.toLowerCase() === cat.toLowerCase()).length;
            const active = filterCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCategory(cat)}
                className={cn(
                  "rounded-full px-3 py-1 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-accent text-white shadow-xs"
                    : "bg-card-subtle text-ink-secondary hover:bg-hairline hover:text-ink",
                )}
              >
                {getCategoryTitle(cat)} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasStandardProducts && (
            <ConfirmDelete
              what="all standard pre-loaded cement & steel sample items"
              onDelete={handleClearStandard}
              label={isClearingStandard ? "Clearing…" : "Clear standard items"}
              className="rounded-full bg-card-subtle px-3 py-1.5 border border-hairline text-[13px] text-danger hover:bg-danger-soft hover:no-underline"
            />
          )}

          <Button
            onClick={() => {
              if (showAddForm) {
                setShowAddForm(false);
                setPreselectedCategory(undefined);
              } else {
                setPreselectedCategory(filterCategory !== "all" ? getCategoryTitle(filterCategory) : undefined);
                setShowAddForm(true);
              }
            }}
            className="gap-1.5 shrink-0"
          >
            {showAddForm ? <X size={15} strokeWidth={2.5} /> : <Plus size={15} strokeWidth={2.5} />}
            <span>{showAddForm ? "Cancel" : "Add item"}</span>
          </Button>
        </div>
      </div>

      {/* Expandable Add Item Form */}
      {showAddForm && (
        <section className="surface p-5 sm:p-6 animate-fade-up border-2 border-accent/20">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-hairline">
            <div>
              <h2 className="text-[17px] font-semibold text-ink">Add new product item</h2>
              <p className="text-[12px] text-ink-secondary">
                Select category → enter brand in this category → enter item type & measurement metric.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setPreselectedCategory(undefined);
              }}
              className="rounded-full p-1 text-ink-tertiary hover:bg-hairline hover:text-ink"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
          <AddProductForm
            existingCategories={categories}
            products={products}
            preselectedCategory={preselectedCategory}
            onSaved={() => {
              setShowAddForm(false);
              setPreselectedCategory(undefined);
            }}
          />
        </section>
      )}

      {/* Hierarchical Products list: Category -> Brand -> Types */}
      {displayedCategories.length === 0 ? (
        <div className="surface p-10 text-center text-ink-secondary space-y-3">
          <Package className="mx-auto size-9 text-ink-tertiary stroke-[1.5]" />
          <p className="text-[15px] font-medium text-ink">No products found</p>
          <p className="text-[13px] text-ink-secondary max-w-sm mx-auto">
            Your catalog is currently empty. Add items categorized with their brand, type, and measurement metrics.
          </p>
          <Button
            variant="secondary"
            onClick={() => setShowAddForm(true)}
            className="gap-1.5 mt-2"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>Add your first item</span>
          </Button>
        </div>
      ) : (
        displayedCategories.map((catName) => {
          const catProducts = products.filter((p) => p.category.toLowerCase() === catName.toLowerCase());
          if (catProducts.length === 0) return null;
          const catBrands = [...new Set(catProducts.map((p) => p.brand.trim()))];

          return (
            <section key={catName} className="surface p-5 sm:p-6 space-y-4">
              {/* Category Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-3">
                <div className="flex items-center gap-3">
                  <div className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent">
                    <Layers size={19} strokeWidth={2.2} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-[18px] font-bold tracking-[-0.3px] text-ink">
                        {getCategoryTitle(catName)}
                      </h2>
                      <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-semibold text-accent">
                        {catProducts.length} {catProducts.length === 1 ? "item" : "items"}
                      </span>
                    </div>
                    <p className="text-[12px] text-ink-secondary">
                      {catBrands.length} {catBrands.length === 1 ? "brand" : "brands"} under {getCategoryTitle(catName)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPreselectedCategory(getCategoryTitle(catName));
                    setShowAddForm(true);
                  }}
                  className="flex items-center gap-1 text-[13px] font-medium text-link hover:underline"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span>+ Add item to {getCategoryTitle(catName)}</span>
                </button>
              </div>

              {/* Brands inside this Category */}
              <div className="space-y-4 pt-1">
                {catBrands.map((brandName) => {
                  const brandItems = catProducts.filter((p) => p.brand.trim() === brandName);

                  return (
                    <div key={brandName} className="rounded-2xl border border-hairline bg-card p-4 space-y-3">
                      {/* Brand Header */}
                      <div className="flex items-center justify-between border-b border-hairline pb-2">
                        <div className="flex items-center gap-2">
                          <span className="h-4 w-1 rounded-full bg-accent" />
                          <h3 className="text-[16px] font-semibold text-ink">
                            {brandName}
                          </h3>
                          <span className="text-[12px] text-ink-tertiary">
                            ({brandItems.length} {brandItems.length === 1 ? "type" : "types"})
                          </span>
                        </div>
                      </div>

                      {/* Types / Variants under this Brand */}
                      <ul className="divide-y divide-hairline">
                        {brandItems.map((p) => {
                          const unitText = unitLabel[p.unit]
                            ? `Sold by the ${unitLabel[p.unit]}`
                            : `Sold by ${p.unit}`;

                          return (
                            <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                              <div className="flex min-w-0 items-center gap-3">
                                {/* Photo or Unit Placeholder */}
                                {p.image ? (
                                  <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-hairline bg-card shadow-2xs">
                                    <Image
                                      src={p.image}
                                      alt={p.variant ?? p.name}
                                      fill
                                      unoptimized
                                      className="object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-card-subtle border border-hairline text-ink-tertiary">
                                    <Package size={20} strokeWidth={1.8} />
                                  </div>
                                )}

                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-semibold text-[15px] text-ink truncate">
                                      {p.variant ?? p.name}
                                    </span>
                                    <span className="shrink-0 rounded-md bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent capitalize">
                                      {unitLabel[p.unit] || p.unit}
                                    </span>
                                    {!p.original && <SampleTag record={p} />}
                                  </div>
                                  <p className="mt-0.5 text-[12px] text-ink-secondary">
                                    {brandName} • <span className="font-medium text-ink">{unitText}</span>
                                  </p>
                                </div>
                              </div>

                              <div className="flex shrink-0 items-center gap-2">
                                <ConfirmDelete
                                  what={`${brandName} ${p.variant ?? p.name}`}
                                  onDelete={() => removeProduct(p.id)}
                                  compact
                                />
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}

/** Form to add any product item following Category -> Brand -> Type -> Unit hierarchy. */
function AddProductForm({
  existingCategories,
  existingBrands = [],
  products = [],
  preselectedCategory,
  onSaved,
}: {
  existingCategories: string[];
  existingBrands?: string[];
  products?: Product[];
  preselectedCategory?: string;
  onSaved?: () => void;
}) {
  const id = useId();
  const router = useRouter();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Available categories: popular + existing
  const allCategoryChoices = [
    ...new Set([
      ...POPULAR_CATEGORIES,
      ...existingCategories.map((c) => c.charAt(0).toUpperCase() + c.slice(1)),
    ]),
  ];

  const initialCat = preselectedCategory || (existingCategories[0] ? (existingCategories[0].charAt(0).toUpperCase() + existingCategories[0].slice(1)) : "Cement");
  const [category, setCategory] = useState<string>(initialCat);
  const [isTypingNewCategory, setIsTypingNewCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [variant, setVariant] = useState("");
  const [unit, setUnit] = useState(() => {
    const c = initialCat.toLowerCase();
    if (c === "cement") return "bag";
    if (c === "steel") return "kg";
    if (c === "paints") return "litre";
    return "piece";
  });
  const [customUnit, setCustomUnit] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pending, startTransition] = useTransition();

  const effectiveCategory = isTypingNewCategory
    ? customCategory.trim()
    : category.trim();

  // Brands already recorded under this chosen category, or fallback to existingBrands
  const brandsForCategory = [
    ...new Set([
      ...products
        .filter((p) => p.category.toLowerCase() === effectiveCategory.toLowerCase())
        .map((p) => p.brand.trim())
        .filter(Boolean),
      ...existingBrands,
    ]),
  ];

  const effectiveUnit =
    unit === "custom"
      ? customUnit.trim()
      : unit;

  const isFormValid =
    effectiveCategory.length > 0 &&
    brand.trim().length > 0 &&
    variant.trim().length > 0 &&
    effectiveUnit.length > 0;

  async function handleFile(file?: File) {
    if (!file) return;
    setPhotoError(null);
    if (!file.type.startsWith("image/")) {
      setPhotoError("Please select an image file (PNG, JPG, or WEBP).");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setPhotoError("Image is too large. Please choose an image under 8MB.");
      return;
    }
    try {
      const dataUrl = await processProductPhoto(file);
      setPhoto(dataUrl);
      setPhotoName(file.name);
    } catch {
      setPhotoError("Could not process this image. Please try another.");
    }
  }

  function submitForm() {
    if (!isFormValid || pending) return;
    setProblem(null);

    startTransition(async () => {
      const result = await createProduct({
        brand: brand.trim(),
        variant: variant.trim(),
        category: effectiveCategory,
        unit: effectiveUnit,
        image: photo ?? undefined,
      });

      if (!result.ok) {
        setProblem(result.problem);
        return;
      }

      toast(`${brand.trim()} ${variant.trim()} added to products`);
      router.refresh();
      onSaved?.();
    });
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submitForm();
      }}
    >
      {/* 1. Category Selection */}
      <div className="space-y-2">
        <label className="block text-[13px] font-medium text-ink-secondary">
          Product Category <span className="text-danger">*</span>
        </label>
        <div className="flex flex-wrap items-center gap-1.5">
          {allCategoryChoices.map((cat) => {
            const isSelected = !isTypingNewCategory && category.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setCategory(cat);
                  setIsTypingNewCategory(false);
                  // Contextual unit defaults:
                  if (cat.toLowerCase() === "cement" && unit !== "bag") setUnit("bag");
                  if (cat.toLowerCase() === "steel" && unit !== "kg" && unit !== "bar") setUnit("kg");
                  if (cat.toLowerCase() === "paints" && unit !== "litre") setUnit("litre");
                  if (cat.toLowerCase() === "pipes & fittings" && unit !== "piece" && unit !== "metre") setUnit("piece");
                }}
                className={cn(
                  "rounded-full px-3 py-1 text-[13px] font-medium transition-all border",
                  isSelected
                    ? "border-accent bg-accent text-white shadow-xs"
                    : "border-hairline bg-card-subtle text-ink-secondary hover:text-ink hover:border-divider",
                )}
              >
                {cat}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setIsTypingNewCategory(true)}
            className={cn(
              "rounded-full px-3 py-1 text-[13px] font-medium transition-all border flex items-center gap-1",
              isTypingNewCategory
                ? "border-accent bg-accent text-white shadow-xs"
                : "border-dashed border-divider bg-card text-link hover:border-accent",
            )}
          >
            <Plus size={14} />
            <span>Add new category</span>
          </button>
        </div>

        {isTypingNewCategory && (
          <div className="pt-1.5 max-w-sm animate-fade-up">
            <Field label="New Category Name" htmlFor={`${id}-new-cat`} hint="e.g. Sanitaryware, Tiles, Timber">
              <input
                id={`${id}-new-cat`}
                className={inputClass}
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Type your category name"
                maxLength={40}
                autoFocus
              />
            </Field>
          </div>
        )}
      </div>

      {/* 2. Brand & Item Name */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Field
            label="Brand / Manufacturer"
            htmlFor={`${id}-brand`}
            hint={
              brandsForCategory.length
                ? `Brands in ${effectiveCategory}: ${brandsForCategory.slice(0, 3).join(", ")}`
                : "e.g. Ultratech, Vizag Steel, Asian Paints, Local"
            }
          >
            <input
              id={`${id}-brand`}
              className={inputClass}
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g. Ultratech, Deccan, Tata"
              maxLength={40}
              autoCapitalize="words"
              required
            />
          </Field>
          {brandsForCategory.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 pt-1.5">
              <span className="text-[11px] text-ink-tertiary">Brands in {effectiveCategory}:</span>
              {brandsForCategory.slice(0, 6).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBrand(b)}
                  className="rounded-md bg-card-subtle border border-hairline px-2 py-0.5 text-[11px] text-ink-secondary hover:text-ink hover:border-divider"
                >
                  {b}
                </button>
              ))}
            </div>
          )}
        </div>

        <Field
          label="Item Name / Variant"
          htmlFor={`${id}-variant`}
          hint="e.g. PPC, OPC 53, TMT 12 mm Bar, Apex 20L, 4-inch PVC"
        >
          <input
            id={`${id}-variant`}
            className={inputClass}
            value={variant}
            onChange={(e) => setVariant(e.target.value)}
            placeholder="e.g. TMT 12 mm Bar, OPC 53"
            maxLength={50}
            required
          />
        </Field>
      </div>

      {/* 3. Quantity / Measurement Metrics */}
      <div className="space-y-2 rounded-2xl bg-card-subtle/70 p-4 border border-hairline">
        <label className="block text-[13px] font-medium text-ink">
          Quantity Unit / Measurement Metric <span className="text-danger">*</span>
        </label>
        <p className="text-[12px] text-ink-secondary">
          Pick how this item is counted and billed (from kilos to bars, bags, tonnes, pieces, and more):
        </p>

        {/* Popular Quick Metric Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {QUICK_METRICS.map((qm) => {
            const isSelected = unit === qm.value;
            return (
              <button
                key={qm.value}
                type="button"
                onClick={() => setUnit(qm.value)}
                className={cn(
                  "rounded-full px-3 py-1 text-[13px] font-medium transition-all border",
                  isSelected
                    ? "border-accent bg-accent text-white shadow-xs"
                    : "border-hairline bg-card text-ink-secondary hover:text-ink hover:border-divider",
                )}
              >
                {qm.label}
              </button>
            );
          })}
        </div>

        {/* All units dropdown */}
        <div className="grid gap-3 sm:grid-cols-2 pt-2">
          <Field label="All Metrics / Units" htmlFor={`${id}-all-units`}>
            <Select
              id={`${id}-all-units`}
              label="Measurement Metric"
              value={unit}
              onChange={setUnit}
              options={UNIT_OPTIONS}
            />
          </Field>

          {unit === "custom" && (
            <Field
              label="Custom unit name"
              htmlFor={`${id}-custom-unit`}
              hint="e.g. packet, roll, drum, bucket, trip"
            >
              <input
                id={`${id}-custom-unit`}
                className={inputClass}
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value)}
                placeholder="e.g. packet, roll, drum"
                maxLength={20}
                required
              />
            </Field>
          )}
        </div>
      </div>

      {/* 4. Product Photo Upload Box (Optional) */}
      <div className="space-y-1.5">
        <label className="block text-[13px] font-medium text-ink">
          Product Picture <span className="text-ink-tertiary font-normal">(Optional)</span>
        </label>

        {photo ? (
          <div className="flex items-center gap-4 rounded-2xl bg-card border border-hairline p-3">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-hairline shadow-2xs">
              <Image
                src={photo}
                alt="Product preview"
                fill
                unoptimized
                className="object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-ink truncate flex items-center gap-1.5">
                <Check size={14} className="text-teal" />
                <span>Photo ready to save</span>
              </p>
              <p className="text-[12px] text-ink-secondary truncate">
                {photoName ?? "Image attached"}
              </p>
              <div className="mt-1 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[12px] font-medium text-link hover:underline"
                >
                  Change picture
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPhoto(null);
                    setPhotoName(null);
                  }}
                  className="text-[12px] font-medium text-danger hover:underline flex items-center gap-1"
                >
                  <Trash2 size={12} />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFile(file);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors",
              isDragging
                ? "border-accent bg-accent-soft/30"
                : "border-divider bg-card-subtle/50 hover:border-accent/60 hover:bg-card-subtle",
            )}
          >
            <div className="grid size-11 place-items-center rounded-full bg-card border border-hairline text-ink-secondary shadow-2xs">
              <UploadCloud size={20} className="text-accent" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-ink">
                Click to upload picture or drag and drop
              </p>
              <p className="text-[11px] text-ink-tertiary">
                PNG, JPG or WEBP (optional, under 8MB)
              </p>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />

        {photoError && (
          <p className="text-[12px] text-danger">{photoError}</p>
        )}
      </div>

      {problem && (
        <p role="alert" className="text-[13px] text-danger">
          {problem}
        </p>
      )}

      {/* Submit / Cancel Buttons */}
      <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-hairline">
        {onSaved && (
          <Button
            type="button"
            variant="secondary"
            onClick={onSaved}
            disabled={pending}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={pending || !isFormValid}
          className="gap-1.5"
        >
          {pending ? (
            "Saving…"
          ) : (
            <>
              <Check size={16} strokeWidth={2.5} />
              <span>Save product</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

/** Standalone export for backwards compatibility. */
export function AddProduct({ brands }: { brands: string[] }) {
  return <AddProductForm existingCategories={POPULAR_CATEGORIES} existingBrands={brands} />;
}
