"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { AffixInput, Field, inputClass } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import type { Product } from "@/lib/data/types";
import { formatINR } from "@/lib/format";
import { createProduct, saveRate } from "./actions";

/** Each product with its list rate, grouped by brand; a changed rate is saved with the tick next to it. */
export function ProductRates({ products }: { products: Product[] }) {
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
                // Keyed by the saved rate, so the box starts afresh after a save.
                <RateRow key={`${p.id}:${p.listRate}`} product={p} />
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function RateRow({ product }: { product: Product }) {
  const id = useId();
  const router = useRouter();
  const toast = useToast();
  const [rate, setRate] = useState(product.listRate ? String(product.listRate) : "");
  const [pending, startTransition] = useTransition();
  const value = parseFloat(rate);
  const changed = rate.trim() !== "" && Number.isFinite(value) && value !== product.listRate;

  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <label htmlFor={`${id}-rate`} className="min-w-0 flex-1">
        <span className="block text-[15px] text-ink">{product.variant ?? product.name}</span>
        <span className="block text-[12px] text-ink-secondary">
          {product.category === "cement" ? "per bag" : "per kg"}
          {!product.listRate && " · no list rate yet"}
        </span>
      </label>
      <div className="w-36">
        <AffixInput id={`${id}-rate`} prefix="₹" inputMode="decimal" placeholder="0" value={rate} onChange={(e) => setRate(e.target.value.replace(/[^\d.]/g, ""))} />
      </div>
      <IconButton
        label={`Save ${product.name} rate`}
        variant={changed ? "primary" : "secondary"}
        disabled={!changed || pending}
        onClick={() =>
          startTransition(async () => {
            const result = await saveRate(product.id, value);
            if (!result.ok) {
              toast(result.problem);
              return;
            }
            toast(`${product.name}: ${formatINR(value)} ${product.category === "cement" ? "a bag" : "a kg"}`);
            router.refresh();
          })
        }
      >
        <Check size={19} strokeWidth={2.25} aria-hidden />
      </IconButton>
    </li>
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
  const [rate, setRate] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setProblem(null);
        startTransition(async () => {
          const result = await createProduct({ brand, variant, category, listRate: parseFloat(rate) || 0 });
          if (!result.ok) {
            setProblem(result.problem);
            return;
          }
          toast(`${brand.trim()} ${variant.trim()} added`);
          setVariant("");
          setRate("");
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
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Brand" htmlFor={`${id}-brand`} hint={brands.length ? `e.g. ${brands.slice(0, 2).join(", ")}` : undefined}>
          <input id={`${id}-brand`} className={inputClass} value={brand} onChange={(e) => setBrand(e.target.value)} maxLength={40} autoCapitalize="words" />
        </Field>
        <Field label="Type" htmlFor={`${id}-variant`} hint="e.g. PPC, OPC, TMT 8 mm">
          <input id={`${id}-variant`} className={inputClass} value={variant} onChange={(e) => setVariant(e.target.value)} maxLength={40} />
        </Field>
        <Field label="List rate" htmlFor={`${id}-rate`}>
          <AffixInput id={`${id}-rate`} prefix="₹" inputMode="decimal" placeholder="0" value={rate} onChange={(e) => setRate(e.target.value.replace(/[^\d.]/g, ""))} />
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
