import type { Metadata } from "next";
import { Suspense } from "react";
import { OwnerOnly } from "@/components/auth/owner-only";
import { LorryDue, LorryMeta, LorryStateChip, LorryTitle } from "@/components/lorries/lorry-bits";
import { ListSkeleton, SectionCard } from "@/components/ui/blocks";
import { ButtonLink } from "@/components/ui/button";
import { DataOrigin } from "@/components/ui/data-origin";
import { DataTools } from "@/components/ui/data-tools";
import { ExportTable } from "@/components/ui/export-table";
import { PageHeader } from "@/components/ui/page-header";
import { getFirms, getLorries, getProducts, getToday } from "@/lib/data";
import { inDateFilter } from "@/lib/date-filter";
import { cn } from "@/lib/cn";
import { formatDate, formatINR } from "@/lib/format";
import { lorryCost, lorryLeft, lorrySaleValue, lorryState, lorryStateChip, updateDueOn, type LorryState } from "@/lib/lorries";
import { pageDateFilter } from "@/lib/page-dates";
import { describeQuantities } from "@/lib/quantities";

export const metadata: Metadata = { title: "Lorry sales" };

// Late updates first, then due today, still selling, and sold out.
const order: Record<LorryState, number> = { late: 0, due: 1, selling: 2, sold: 3 };

/**
 * Company lorries sold straight off the truck. Each is sold as a whole, not bill by bill: the owner updates what is
 * sold from it (like a godown sale) and marks it sold out, and Home reminds them when that is late. Owner only.
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
  const [all, products, today, dates, firms] = await Promise.all([getLorries(), getProducts(), getToday(), pageDateFilter(searchParams), getFirms()]);
  const lorries = all.filter((l) => inDateFilter(l.invoiceDate, dates)).sort((a, b) => order[lorryState(a, today)] - order[lorryState(b, today)]);
  const firmName = (id?: string) => firms.find((f) => f.id === id)?.name;
  return (
    <div className="space-y-4">
      <DataTools title="Lorry sales" />
      <ExportTable
        title="Lorry sales"
        columns={["Lorry", "Company", "Invoice date", "Update due", "Status", "Invoice value", "Sale value", "Margin", "Sold out on"]}
        rows={lorries.map((l) => {
          const cost = lorryCost(l);
          const value = l.sold?.value ?? lorrySaleValue(l);
          return [
            l.lorryNo,
            l.companyName,
            formatDate(l.invoiceDate),
            formatDate(updateDueOn(l)),
            lorryStateChip[lorryState(l, today)].label,
            cost ? formatINR(cost) : "",
            value ? formatINR(value) : "",
            value && cost ? formatINR(value - cost) : "",
            l.sold ? formatDate(l.sold.on) : "",
          ];
        })}
      />
      {lorries.length === 0 && <SectionCard>{dates.kind === "all" ? "No lorries yet. Add one under Purchases › Lorry." : "No lorries for these dates."}</SectionCard>}
      {lorries.map((l) => {
        const cost = lorryCost(l);
        const value = l.sold?.value ?? lorrySaleValue(l);
        const left = lorryLeft(l).filter((x) => x.qty > 0);
        return (
          <SectionCard key={l.id} title={<LorryTitle lorry={l} />} action={<LorryStateChip lorry={l} today={today} />}>
            <LorryMeta lorry={l} firmName={firmName(l.firmId)} />
            <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Figure label="Came on it" value={describeQuantities(l.lines, products)} />
              <Figure label={l.sold ? "Sold out on" : "Left on it"} value={l.sold ? formatDate(l.sold.on) : left.length ? describeQuantities(left, products) : "Nothing"} />
              <Figure label={l.sold ? "Sold for" : "Sold so far"} value={formatINR(value)} strong />
              {/* Margin only once something is sold: before that it would just be minus the invoice value. */}
              {cost && value > 0 ? <Figure label="Margin" value={formatINR(value - cost)} tone={value >= cost ? "good" : "danger"} /> : null}
            </dl>
            <LorryDue lorry={l} today={today} />
            {l.sale?.notes && <p className="mt-2 text-[13px] text-ink-secondary">{l.sale.notes}</p>}
            {l.original ? (
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
