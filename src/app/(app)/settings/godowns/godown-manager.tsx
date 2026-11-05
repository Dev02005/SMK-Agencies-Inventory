"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { Building2, Check, Package, Pencil, Plus, Search, Users, Warehouse, X, Layers, CheckSquare, Square } from "lucide-react";
import { Chip } from "@/components/ui/chip";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { Field, inputClass } from "@/components/ui/field";
import { SectionCard } from "@/components/ui/blocks";
import { useToast } from "@/components/ui/toast";
import type { Godown, Product, Profile } from "@/lib/data/types";
import { cn } from "@/lib/cn";
import { saveGodownAction, deleteGodownAction } from "./actions";

type Props = {
  initialGodowns: Godown[];
  products: Product[];
  profiles: Profile[];
  designations: Record<string, string>;
  balances: { godownId: string; productId: string; qty: number }[];
};

export function GodownManager({
  initialGodowns,
  products,
  profiles,
  designations,
  balances,
}: Props) {
  const toast = useToast();
  const [godowns, setGodowns] = useState<Godown[]>(initialGodowns);
  const [editingGodown, setEditingGodown] = useState<Godown | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "own" | "company">("all");

  // Keep state synced when props revalidate
  useMemo(() => {
    setGodowns(initialGodowns);
  }, [initialGodowns]);

  // Profiles eligible for in-charge (staff & office & godown, excluding owners if desired, but allow any staff/admin)
  const staffProfiles = useMemo(() => {
    return profiles.filter((p) => p.active !== false);
  }, [profiles]);

  const stockCount = (godownId: string) =>
    balances.filter((b) => b.godownId === godownId && b.qty > 0).length;

  const filteredGodowns = useMemo(() => {
    return godowns.filter((g) => {
      const matchSearch =
        !search.trim() ||
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        g.place.toLowerCase().includes(search.toLowerCase());
      const matchType =
        filterType === "all" ||
        (filterType === "own" && g.own) ||
        (filterType === "company" && !g.own);
      return matchSearch && matchType;
    });
  }, [godowns, search, filterType]);

  const inChargeNames = (ids: string[] = []) => {
    if (!ids.length) return "Not assigned";
    return ids
      .map((id) => {
        const p = profiles.find((prof) => prof.id === id);
        if (!p) return null;
        const desig = designations[p.id];
        return desig ? `${p.fullName} (${desig})` : p.fullName;
      })
      .filter(Boolean)
      .join(", ") || "Not assigned";
  };

  const linkedProductsSummary = (g: Godown) => {
    if (g.linkAllProducts || (!g.productIds?.length && g.own)) {
      return { label: "All products", isAll: true, count: products.length, brands: [] };
    }
    const ids = new Set(g.productIds ?? []);
    const linked = products.filter((p) => ids.has(p.id));
    const brands = [...new Set(linked.map((p) => p.brand))];
    if (linked.length === 0) {
      // Fallback inference by godown name
      const nameLower = g.name.toLowerCase();
      const byBrand = products.filter((p) => nameLower.includes(p.brand.toLowerCase()));
      if (byBrand.length > 0) {
        const b = [...new Set(byBrand.map((p) => p.brand))];
        return { label: `${byBrand.length} items (${b.join(", ")})`, isAll: false, count: byBrand.length, brands: b };
      }
      return { label: "None linked", isAll: false, count: 0, brands: [] };
    }
    return {
      label: `${linked.length} items (${brands.join(", ")})`,
      isAll: false,
      count: linked.length,
      brands,
    };
  };

  return (
    <div className="space-y-6">
      {/* Existing Godowns Directory */}
      <section className="surface p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-[17px] font-semibold tracking-[-0.3px] text-ink">
              All Godowns ({godowns.length})
            </h2>
            <p className="text-[13px] text-ink-secondary">
              Configure in-charge staff and linked products for each godown.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className={cn(
                "px-2.5 py-1 text-[13px] rounded-lg font-medium transition-colors",
                filterType === "all" ? "bg-accent text-white" : "bg-card-subtle text-ink-secondary hover:text-ink"
              )}
            >
              All ({godowns.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("own")}
              className={cn(
                "px-2.5 py-1 text-[13px] rounded-lg font-medium transition-colors",
                filterType === "own" ? "bg-accent text-white" : "bg-card-subtle text-ink-secondary hover:text-ink"
              )}
            >
              Our Own ({godowns.filter((g) => g.own).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("company")}
              className={cn(
                "px-2.5 py-1 text-[13px] rounded-lg font-medium transition-colors",
                filterType === "company" ? "bg-accent text-white" : "bg-card-subtle text-ink-secondary hover:text-ink"
              )}
            >
              Company ({godowns.filter((g) => !g.own).length})
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            className={cn(inputClass, "pl-9 text-[13px]")}
            placeholder="Search godowns by name or place..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* List of Godown Cards */}
        <div className="divide-y divide-hairline">
          {filteredGodowns.length === 0 ? (
            <p className="py-6 text-center text-[14px] text-ink-secondary">
              No godowns found matching &quot;{search}&quot;.
            </p>
          ) : (
            filteredGodowns.map((g) => {
              const summary = linkedProductsSummary(g);
              const inCharges = g.inCharge ?? [];
              return (
                <div key={g.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-ink text-[15px]">{g.name}</span>
                      {g.own ? (
                        <Chip tone="accent">Our Godown</Chip>
                      ) : (
                        <Chip tone="neutral">Company Depot</Chip>
                      )}
                      <span className="text-[12px] text-ink-secondary">({g.place})</span>
                    </div>

                    {/* In-charges */}
                    <div className="flex items-center gap-1.5 text-[13px] text-ink-secondary">
                      <Users size={14} className="shrink-0 text-ink-muted" />
                      <span className="font-medium text-ink">In-charge:</span>
                      <span>{inChargeNames(inCharges)}</span>
                      {inCharges.length > 1 && (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[11px] font-semibold bg-accent-soft text-accent">
                          {inCharges.length} staff
                        </span>
                      )}
                    </div>

                    {/* Linked Products */}
                    <div className="flex items-center gap-1.5 text-[13px] text-ink-secondary">
                      <Package size={14} className="shrink-0 text-ink-muted" />
                      <span className="font-medium text-ink">Linked Products:</span>
                      {summary.isAll ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                          <Check size={13} strokeWidth={2.5} /> All products in catalog
                        </span>
                      ) : (
                        <span className="text-ink font-medium">
                          {summary.label}
                        </span>
                      )}
                    </div>

                    <div className="text-[12px] text-ink-muted">
                      {stockCount(g.id)} products currently in stock
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      type="button"
                      onClick={() => setEditingGodown(g)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-card-subtle px-3 py-1.5 text-[13px] font-medium text-ink hover:bg-hairline hover:text-accent transition-colors"
                    >
                      <Pencil size={14} />
                      Edit
                    </button>
                    <ConfirmDelete
                      what={g.name}
                      compact
                      onDelete={async () => {
                        const res = await deleteGodownAction(g.id);
                        if (!res.ok) {
                          toast(res.error || "Cannot delete godown");
                          return { ok: false, problem: res.error || "Cannot delete godown" };
                        }
                        setGodowns((prev) => prev.filter((item) => item.id !== g.id));
                        toast(`Deleted ${g.name}`);
                        return { ok: true };
                      }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Add a Godown Section */}
      <SectionCard title="Add a godown">
        <GodownForm
          products={products}
          staffProfiles={staffProfiles}
          designations={designations}
          onSubmit={async (data) => {
            const res = await saveGodownAction(data);
            if (!res.ok || !res.godown) {
              toast(res.error || "Failed to add godown");
              return false;
            }
            setGodowns((prev) => [...prev, res.godown!]);
            toast(`Added godown: ${res.godown.name}`);
            return true;
          }}
        />
      </SectionCard>

      {/* Edit Godown Modal */}
      {editingGodown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-[680px] my-8 rounded-2xl bg-white border border-hairline shadow-2xl p-6 space-y-5 animate-scale-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-hairline pb-4">
              <div>
                <h3 className="text-[18px] font-semibold text-ink">Edit Godown</h3>
                <p className="text-[13px] text-ink-secondary">
                  Update in-charges, place, and products linked to {editingGodown.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingGodown(null)}
                className="grid size-8 place-items-center rounded-full text-ink-secondary hover:bg-hairline"
              >
                <X size={18} />
              </button>
            </div>

            <GodownForm
              initial={editingGodown}
              products={products}
              staffProfiles={staffProfiles}
              designations={designations}
              submitLabel="Save changes"
              onCancel={() => setEditingGodown(null)}
              onSubmit={async (data) => {
                const res = await saveGodownAction({ ...data, id: editingGodown.id });
                if (!res.ok || !res.godown) {
                  toast(res.error || "Failed to update godown");
                  return false;
                }
                setGodowns((prev) =>
                  prev.map((item) => (item.id === res.godown!.id ? res.godown! : item))
                );
                toast(`Updated godown: ${res.godown.name}`);
                setEditingGodown(null);
                return true;
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reusable Godown Add/Edit Form Component ────────────────────────────────────────

type GodownFormProps = {
  initial?: Godown;
  products: Product[];
  staffProfiles: Profile[];
  designations: Record<string, string>;
  submitLabel?: string;
  onCancel?: () => void;
  onSubmit: (data: {
    name: string;
    place: string;
    own: boolean;
    inCharge: string[];
    productIds: string[];
    linkAllProducts: boolean;
  }) => Promise<boolean>;
};

function GodownForm({
  initial,
  products,
  staffProfiles,
  designations,
  submitLabel = "Add godown",
  onCancel,
  onSubmit,
}: GodownFormProps) {
  const formId = useId();
  const [name, setName] = useState(initial?.name ?? "");
  const [place, setPlace] = useState(initial?.place ?? "");
  const [own, setOwn] = useState(initial?.own ?? false);

  // In-charge staff: MULTI-SELECT support
  const [selectedInCharges, setSelectedInCharges] = useState<string[]>(
    initial?.inCharge ?? []
  );

  // Product linking: "all" vs "specific"
  const [linkAllProducts, setLinkAllProducts] = useState<boolean>(
    initial?.linkAllProducts ?? (initial ? Boolean(initial.own) : false)
  );

  // Selected specific product IDs
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(() => {
    if (initial?.productIds?.length) return initial.productIds;
    // Pre-populate with matching brand products if name mentions brand
    if (initial?.name) {
      const nameLower = initial.name.toLowerCase();
      const matched = products.filter((p) => nameLower.includes(p.brand.toLowerCase()));
      if (matched.length > 0) return matched.map((p) => p.id);
    }
    return [];
  });

  const [productSearch, setProductSearch] = useState("");
  const [pending, startTransition] = useTransition();

  // Distinct brands available in catalog
  const catalogBrands = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      map.set(p.brand, (map.get(p.brand) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([brand, count]) => ({ brand, count }));
  }, [products]);

  // Grouped products by category and brand
  const groupedProducts = useMemo(() => {
    const filtered = products.filter(
      (p) =>
        !productSearch.trim() ||
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.brand.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.category.toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.variant && p.variant.toLowerCase().includes(productSearch.toLowerCase()))
    );

    const categoriesMap = new Map<string, Map<string, Product[]>>();
    for (const p of filtered) {
      const cat = p.category || "General";
      if (!categoriesMap.has(cat)) categoriesMap.set(cat, new Map());
      const brandMap = categoriesMap.get(cat)!;
      if (!brandMap.has(p.brand)) brandMap.set(p.brand, []);
      brandMap.get(p.brand)!.push(p);
    }

    return Array.from(categoriesMap.entries()).map(([category, brandsMap]) => ({
      category,
      brands: Array.from(brandsMap.entries()).map(([brand, items]) => ({
        brand,
        items,
      })),
    }));
  }, [products, productSearch]);

  const toggleInCharge = (profileId: string) => {
    setSelectedInCharges((prev) =>
      prev.includes(profileId) ? prev.filter((id) => id !== profileId) : [...prev, profileId]
    );
  };

  const toggleProduct = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const toggleBrand = (brandName: string) => {
    const brandProductIds = products.filter((p) => p.brand === brandName).map((p) => p.id);
    const allSelected = brandProductIds.every((id) => selectedProductIds.includes(id));
    if (allSelected) {
      // Remove all brand products
      setSelectedProductIds((prev) => prev.filter((id) => !brandProductIds.includes(id)));
    } else {
      // Add all brand products
      setSelectedProductIds((prev) => Array.from(new Set([...prev, ...brandProductIds])));
    }
  };

  const handleWhoseGodownChange = (isOwn: boolean) => {
    setOwn(isOwn);
    // If switching to own godown, default to linking all products
    if (isOwn && !initial) {
      setLinkAllProducts(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!place.trim()) return;

    startTransition(async () => {
      const ok = await onSubmit({
        name: name.trim(),
        place: place.trim(),
        own,
        inCharge: selectedInCharges,
        productIds: linkAllProducts ? [] : selectedProductIds,
        linkAllProducts,
      });
      if (ok && !initial) {
        setName("");
        setPlace("");
        setSelectedInCharges([]);
        setLinkAllProducts(false);
        setSelectedProductIds([]);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Basic details */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Godown name *" htmlFor={`${formId}-name`}>
          <input
            id={`${formId}-name`}
            className={inputClass}
            placeholder="e.g. UltraTech Cements godown"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Field>
        <Field label="Place *" htmlFor={`${formId}-place`}>
          <input
            id={`${formId}-place`}
            className={inputClass}
            placeholder="e.g. Srikakulam, Tekkali, Polaki"
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            required
          />
        </Field>
      </div>

      {/* Whose Godown */}
      <Field label="Whose godown" htmlFor={`${formId}-kind`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleWhoseGodownChange(false)}
            className={cn(
              "flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all",
              !own
                ? "border-accent bg-accent-soft/60 shadow-xs ring-1 ring-accent"
                : "border-hairline bg-card-subtle hover:bg-card-subtle/80"
            )}
          >
            <Building2 size={20} className={!own ? "text-accent mt-0.5" : "text-ink-secondary mt-0.5"} />
            <div>
              <p className={cn("text-[14px] font-semibold", !own ? "text-ink" : "text-ink-secondary")}>
                A cement company&apos;s godown
              </p>
              <p className="text-[12px] text-ink-muted">
                Depot where stock is kept (e.g. Maha, UltraTech, Sagar, Deccan depots).
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleWhoseGodownChange(true)}
            className={cn(
              "flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all",
              own
                ? "border-accent bg-accent-soft/60 shadow-xs ring-1 ring-accent"
                : "border-hairline bg-card-subtle hover:bg-card-subtle/80"
            )}
          >
            <Warehouse size={20} className={own ? "text-accent mt-0.5" : "text-ink-secondary mt-0.5"} />
            <div>
              <p className={cn("text-[14px] font-semibold", own ? "text-ink" : "text-ink-secondary")}>
                Our own godown
              </p>
              <p className="text-[12px] text-ink-muted">
                Owned godown selling multiple products &amp; brands (e.g. SKA Polaki).
              </p>
            </div>
          </button>
        </div>
      </Field>

      {/* In-charges: MULTIPLE SELECTION */}
      <div className="space-y-2 border-t border-hairline pt-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-[14px] font-semibold text-ink flex items-center gap-1.5">
              <Users size={16} className="text-accent" />
              In-charge staff (Multiple Selection)
            </label>
            <p className="text-[12px] text-ink-secondary">
              Select one or more staff members responsible for looking after this godown.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedInCharges(staffProfiles.map((p) => p.id))}
              className="text-[12px] font-medium text-accent hover:underline"
            >
              Select all
            </button>
            <span className="text-ink-muted">•</span>
            <button
              type="button"
              onClick={() => setSelectedInCharges([])}
              className="text-[12px] font-medium text-ink-secondary hover:underline"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
          {staffProfiles.map((profile) => {
            const isSelected = selectedInCharges.includes(profile.id);
            const designation = designations[profile.id] || profile.role;
            return (
              <button
                key={profile.id}
                type="button"
                onClick={() => toggleInCharge(profile.id)}
                className={cn(
                  "flex items-center justify-between p-2.5 rounded-xl border text-left transition-all",
                  isSelected
                    ? "border-accent bg-accent-soft/70 shadow-xs ring-1 ring-accent"
                    : "border-hairline bg-card-subtle hover:bg-card-subtle/80 text-ink"
                )}
              >
                <div className="min-w-0 pr-2">
                  <p className="text-[13px] font-medium truncate text-ink">{profile.fullName}</p>
                  <p className="text-[11px] text-ink-muted capitalize truncate">{designation}</p>
                </div>
                <div
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-md border text-white transition-colors",
                    isSelected ? "border-accent bg-accent" : "border-divider bg-white"
                  )}
                >
                  {isSelected && <Check size={13} strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-[12px] text-ink-secondary pt-0.5">
          {selectedInCharges.length} staff member{selectedInCharges.length === 1 ? "" : "s"} selected
        </p>
      </div>

      {/* Product Linking: USER'S CORE REQUIREMENT */}
      <div className="space-y-3 border-t border-hairline pt-4">
        <div>
          <label className="text-[14px] font-semibold text-ink flex items-center gap-1.5">
            <Layers size={16} className="text-accent" />
            Link Products to this Godown
          </label>
          <p className="text-[12px] text-ink-secondary">
            Control which products and brands can be stored and billed from this godown.
          </p>
        </div>

        {/* Mode selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setLinkAllProducts(true)}
            className={cn(
              "flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all",
              linkAllProducts
                ? "border-emerald-600 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-600"
                : "border-hairline bg-card-subtle hover:bg-card-subtle/80"
            )}
          >
            <CheckSquare size={20} className={linkAllProducts ? "text-emerald-600 mt-0.5" : "text-ink-secondary mt-0.5"} />
            <div>
              <p className={cn("text-[14px] font-semibold", linkAllProducts ? "text-emerald-900" : "text-ink")}>
                All products in catalog
              </p>
              <p className="text-[12px] text-ink-muted">
                Stores and bills any cement, steel, and custom items (e.g. Polaki own godown).
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setLinkAllProducts(false)}
            className={cn(
              "flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all",
              !linkAllProducts
                ? "border-accent bg-accent-soft/70 shadow-xs ring-1 ring-accent"
                : "border-hairline bg-card-subtle hover:bg-card-subtle/80"
            )}
          >
            <Square size={20} className={!linkAllProducts ? "text-accent mt-0.5" : "text-ink-secondary mt-0.5"} />
            <div>
              <p className={cn("text-[14px] font-semibold", !linkAllProducts ? "text-accent" : "text-ink")}>
                Specific products &amp; brands only
              </p>
              <p className="text-[12px] text-ink-muted">
                Only selected brands and products appear (e.g. Maha or UltraTech depot).
              </p>
            </div>
          </button>
        </div>

        {/* Specific products picker */}
        {!linkAllProducts && (
          <div className="space-y-4 rounded-xl border border-hairline bg-card-subtle/40 p-4 animate-fade-in">
            {/* Quick Brand Toggles */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-ink-secondary uppercase tracking-wider">
                  Quick Pick by Brand:
                </span>
                <span className="text-[12px] text-ink-muted">
                  Click to select/unselect all items of a brand
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {catalogBrands.map(({ brand, count }) => {
                  const brandProducts = products.filter((p) => p.brand === brand);
                  const isAllBrandSelected = brandProducts.length > 0 && brandProducts.every((p) => selectedProductIds.includes(p.id));
                  const isPartiallySelected = !isAllBrandSelected && brandProducts.some((p) => selectedProductIds.includes(p.id));

                  return (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => toggleBrand(brand)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all",
                        isAllBrandSelected
                          ? "bg-accent text-white border-accent shadow-xs"
                          : isPartiallySelected
                          ? "bg-accent-soft text-accent border-accent"
                          : "bg-white text-ink border-divider hover:bg-card-subtle"
                      )}
                    >
                      {isAllBrandSelected ? <Check size={13} strokeWidth={2.5} /> : <Plus size={13} />}
                      {brand} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Product search & tools */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-hairline">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                  className={cn(inputClass, "pl-8 text-[12px] py-1.5")}
                  placeholder="Filter items by name or variant..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-end gap-2 text-[12px]">
                <button
                  type="button"
                  onClick={() => setSelectedProductIds(products.map((p) => p.id))}
                  className="font-medium text-accent hover:underline"
                >
                  Select all items
                </button>
                <span className="text-ink-muted">•</span>
                <button
                  type="button"
                  onClick={() => setSelectedProductIds([])}
                  className="font-medium text-ink-secondary hover:underline"
                >
                  Clear all
                </button>
              </div>
            </div>

            {/* Grouped list of items */}
            <div className="max-h-60 overflow-y-auto space-y-4 pr-1">
              {groupedProducts.map(({ category, brands }) => (
                <div key={category} className="space-y-2">
                  <div className="text-[12px] font-bold uppercase tracking-wider text-ink-secondary">
                    {category}
                  </div>
                  {brands.map(({ brand, items }) => (
                    <div key={brand} className="pl-2 space-y-1.5">
                      <div className="text-[12px] font-semibold text-ink flex items-center justify-between">
                        <span>{brand}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {items.map((product) => {
                          const isChecked = selectedProductIds.includes(product.id);
                          return (
                            <label
                              key={product.id}
                              className={cn(
                                "flex items-center gap-2 p-2 rounded-lg border text-left text-[13px] cursor-pointer transition-colors",
                                isChecked
                                  ? "bg-accent-soft/70 border-accent text-ink"
                                  : "bg-white border-divider text-ink hover:bg-card-subtle"
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleProduct(product.id)}
                                className="sr-only"
                              />
                              <div
                                className={cn(
                                  "grid size-4 shrink-0 place-items-center rounded border transition-colors",
                                  isChecked ? "border-accent bg-accent text-white" : "border-divider bg-white"
                                )}
                              >
                                {isChecked && <Check size={11} strokeWidth={3} />}
                              </div>
                              <span className="truncate flex-1">
                                {product.variant || product.name}
                              </span>
                              <span className="text-[11px] text-ink-muted shrink-0 capitalize">
                                ({product.unit})
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="text-[12px] text-ink-secondary font-medium pt-1 border-t border-hairline flex items-center justify-between">
              <span>Selected: {selectedProductIds.length} products</span>
              <span>Total in catalog: {products.length}</span>
            </div>
          </div>
        )}
      </div>

      {/* Form actions */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-hairline">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-xl border border-divider px-4 py-2.5 text-[14px] font-medium text-ink hover:bg-card-subtle transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={pending || !name.trim() || !place.trim()}
          className="rounded-xl bg-accent px-5 py-2.5 text-[14px] font-semibold text-white shadow-xs hover:bg-accent/90 disabled:opacity-50 transition-all"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
