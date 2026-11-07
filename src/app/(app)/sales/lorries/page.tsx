import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { OwnerOnly } from "@/components/auth/owner-only";
import { LorryMeta, LorryStateChip, LorryTitle } from "@/components/lorries/lorry-bits";
import { LorryProgress } from "@/components/lorries/lorry-progress";
import { lorryMissing, soldBills } from "@/lib/lorries";
import { ListSkeleton, SectionCard } from "@/components/ui/blocks";
import { ButtonLink } from "@/components/ui/button";
import { DataOrigin } from "@/components/ui/data-origin";
import { DataTools } from "@/components/ui/data-tools";
import { ExportTable } from "@/components/ui/export-table";
import { PageHeader } from "@/components/ui/page-header";
import { getFirms, getLorries, getParties, getProducts } from "@/lib/data";
import { inDateFilter, salesPresets } from "@/lib/date-filter";
import { cn } from "@/lib/cn";
import { formatDate, formatINR } from "@/lib/format";
import { isSavedLorry, lorryCost, lorryLeft, lorrySaleValue, lorryState, type LorryState } from "@/lib/lorries";
import { pageDateFilter } from "@/lib/page-dates";
import { describeQuantities } from "@/lib/quantities";

export const metadata: Metadata = { title: "Lorry sales" };

const tabs: { value: LorryState; label: string }[] = [
  { value: "selling", label: "Selling lorries" },
  { value: "sold", label: "Sold out lorries" },
];

/**
 * Company lorries sold straight off the truck. Each is sold as a whole, not bill by bill: the owner updates what is
 * sold from it and marks it sold out. Owner only.
 */
export default function LorrySalesPage({ searchParams }: PageProps<"/sales/lorries">) {
  return (
    <div className="animate-fade-up">
      <Suspense fallback={<ListSkeleton />}>
        <OwnerOnly what="lorry sales">
          <PageHeader title="Lorry sales" subtitle="Update what each lorry sells; mark it sold out when it is empty" actions={<DataOrigin of="lorries" />} />
          <Suspense fallback={<ListSkeleton />}>
            <Lorries searchParams={searchParams} />
          </Suspense>
        </OwnerOnly>
      </Suspense>
    </div>
  );
}

async function Lorries({ searchParams }: { searchParams: PageProps<"/sales/lorries">["searchParams"] }) {
  const [all, products, dates, firms, params, allParties] = await Promise.all([
    getLorries(),
    getProducts(),
    pageDateFilter(searchParams, salesPresets),
    getFirms(),
    searchParams,
    getParties(),
  ]);

  const parties = allParties
    .filter((p) => p.kind === "cash" || p.kind === "customer" || p.kind === "sub_dealer")
    .map((p) => ({
      id: p.id,
      name: p.name,
      place: p.place,
      kind: p.kind,
      creditLimit: p.creditLimit,
      outstanding: Math.max(p.balance, 0),
      mobile: p.mobile,
    }));

  // Two lists: lorries still selling (the default) and lorries sold out.
  const show: LorryState = params.show === "sold" ? "sold" : "selling";
  // The sale bills dated in the period; a lorry shows when it was bought then or sold any of these.
  const billsIn = (l: (typeof all)[number]) => soldBills(l).filter((b) => inDateFilter(b.date, dates));
  const dated = all.filter((l) => dates.kind === "all" || inDateFilter(l.invoiceDate, dates) || billsIn(l).length > 0);
  const count = (state: LorryState) => dated.filter((l) => lorryState(l) === state).length;
  const lorries = dated.filter((l) => lorryState(l) === show);
  // Each tab keeps the other filters (dates) in its link.
  const hrefFor = (state: LorryState) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (k !== "show" && typeof v === "string") next.set(k, v);
    if (state === "sold") next.set("show", "sold");
    const q = next.toString();
    return q ? `/sales/lorries?${q}` : "/sales/lorries";
  };
  const firmName = (id?: string) => firms.find((f) => f.id === id)?.name;
  return (
    <div className="space-y-4">
      <nav aria-label="Lorry list" className="flex gap-2">
        {tabs.map((t) => (
          <Link
            key={t.value}
            href={hrefFor(t.value)}
            aria-current={t.value === show ? "page" : undefined}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-full px-4 text-[15px] transition-colors",
              t.value === show ? "bg-accent-soft font-medium text-accent" : "border border-hairline bg-card text-ink-secondary hover:text-ink",
            )}
          >
            {t.label}
            <span className="tabular-nums">{count(t.value)}</span>
          </Link>
        ))}
      </nav>
      <DataTools title="Lorry sales" presets={salesPresets} />
      {/* What Download gives: the lorry sale bills in the chosen dates, only lorry sales. */}
      <ExportTable
        title="Lorry sale bills"
        columns={["Date", "Bill no.", "Truck number", "Company", "Customer", "Place", "Phone", "Bags", "Amount"]}
        rows={lorries.flatMap((l) =>
          billsIn(l).map((b) => {
            const p = parties.find((x) => x.id === b.partyId || (b.soldTo && x.name.toLowerCase() === b.soldTo.toLowerCase()));
            return [
              b.date ? formatDate(b.date) : "",
              b.billNo,
              l.lorryNo,
              l.companyName,
              p?.name ?? b.cashName ?? b.soldTo ?? "",
              p?.place ?? b.place ?? "",
              p?.mobile ?? b.cashMobile ?? "",
              b.qty,
              formatINR(b.amount),
            ];
          }),
        )}
      />
      {lorries.length === 0 && (
        <SectionCard>
          {all.length === 0
            ? "No lorries yet. Add one under Purchases › Lorry."
            : show === "selling"
              ? dates.kind === "all" ? "No lorry is selling right now." : "No lorry selling for these dates."
              : dates.kind === "all" ? "No lorry has sold out yet." : "No lorry sold out on these dates."}
        </SectionCard>
      )}
      {lorries.map((l) => {
        const cost = lorryCost(l);
        const value = l.sold?.value ?? lorrySaleValue(l);
        const left = lorryLeft(l).filter((x) => x.qty > 0);
        return (
          <SectionCard key={l.id} title={<LorryTitle lorry={l} />} action={<LorryStateChip lorry={l} />}>
            <LorryMeta lorry={l} firmName={firmName(l.firmId)} />
            <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Figure label="Came on it" value={describeQuantities(l.lines, products)} />
              <Figure label={l.sold ? "Sold out on" : "Left on it"} value={l.sold ? formatDate(l.sold.on) : left.length ? describeQuantities(left, products) : "Nothing"} />
              <Figure label={l.sold ? "Sold for" : "Sold so far"} value={formatINR(value)} strong />
              {/* Margin only once it is sold out: before that the sale so far is set against the whole lorry's invoice. */}
              {cost && l.sold ? <Figure label="Margin" value={formatINR(l.sold.value - cost)} tone={l.sold.value >= cost ? "good" : "danger"} /> : null}
            </dl>
            <div className="mt-4">
              <LorryProgress loaded={l.lines} sold={(pid) => l.sale?.lines.find((x) => x.productId === pid)?.qty ?? 0} products={products} bills={billsIn(l)} parties={parties} />
            </div>
            {lorryMissing(l).length > 0 && (
              <p className="mt-3 rounded-xl bg-danger-soft px-3 py-2 text-[13px] font-medium text-danger">Missing: {lorryMissing(l).join(", ")}</p>
            )}
            {l.sale?.notes && <p className="mt-2 text-[13px] text-ink-secondary">{l.sale.notes}</p>}
            {isSavedLorry(l) ? (
              <ButtonLink href={`/sales/lorries/${l.id}`} variant={l.sold ? "secondary" : "primary"} className="mt-4">
                {l.sold ? "View or correct" : "Update sale"}
              </ButtonLink>
            ) : (
              <p className="mt-3 text-[13px] text-ink-secondary">Sample lorry: only lorries you enter can be updated.</p>
            )}
          </SectionCard>
        );
      })}
    </div>
  );
}

function Figure({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: "good" | "danger" }) {
  return (
    <div>
      <dt className="text-[13px] text-ink-secondary">{label}</dt>
      <dd className={cn("text-[15px] tabular-nums", strong && "text-[17px] font-semibold", tone === "good" ? "text-good" : tone === "danger" ? "text-danger" : "text-ink")}>{value}</dd>
    </div>
  );
}
