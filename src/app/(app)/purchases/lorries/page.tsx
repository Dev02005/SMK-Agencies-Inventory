import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { OwnerOnly } from "@/components/auth/owner-only";
import { LorryCost, LorryItems, LorryMeta, LorryStateChip, LorryTitle } from "@/components/lorries/lorry-bits";
import { ListSkeleton, SectionCard } from "@/components/ui/blocks";
import { ButtonLink } from "@/components/ui/button";
import { DataOrigin } from "@/components/ui/data-origin";
import { DataTools } from "@/components/ui/data-tools";
import { ExportTable } from "@/components/ui/export-table";
import { PageHeader } from "@/components/ui/page-header";
import { getFirms, getLorries, getProducts } from "@/lib/data";
import { inDateFilter } from "@/lib/date-filter";
import { formatDate, formatINR } from "@/lib/format";
import { isSavedLorry, lorryState, lorryStateChip } from "@/lib/lorries";
import { pageDateFilter } from "@/lib/page-dates";
import { describeQuantities } from "@/lib/quantities";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { removeLorry } from "./actions";
import { DeviceLorryImport } from "./device-lorry-import";

export const metadata: Metadata = { title: "Lorry purchases" };

/**
 * Company lorries bought to be sold straight off the truck: firm, company, invoice and what came on them. Each is
 * sold as a whole; its sale is updated under Sales › Lorry sales. Only the owner deals in lorries.
 */
export default function LorryPurchasesPage({ searchParams }: PageProps<"/purchases/lorries">) {
  return (
    <div className="animate-fade-up">
      <Suspense fallback={<ListSkeleton />}>
        <OwnerOnly what="lorry purchases">
          <PageHeader
            title="Lorry purchases"
            subtitle="Company lorries bought to sell straight off the truck"
            actions={
              <>
                <DataOrigin of="lorries" />
                <ButtonLink href="/purchases/lorries/new">New lorry purchase</ButtonLink>
              </>
            }
          />
          <DeviceLorryImport />
          <Suspense fallback={<ListSkeleton />}>
            <Lorries searchParams={searchParams} />
          </Suspense>
        </OwnerOnly>
      </Suspense>
    </div>
  );
}

async function Lorries({ searchParams }: { searchParams: PageProps<"/purchases/lorries">["searchParams"] }) {
  const [all, products, dates, firms] = await Promise.all([getLorries(), getProducts(), pageDateFilter(searchParams), getFirms()]);
  const lorries = all.filter((l) => inDateFilter(l.invoiceDate, dates));
  const firmName = (id?: string) => firms.find((f) => f.id === id)?.name;
  return (
    <div className="space-y-4">
      <DataTools title="Lorry purchases" />
      <ExportTable
        title="Lorry purchases"
        columns={["Invoice number", "Invoice date", "Truck received on", "Firm", "Truck number", "Company", "Driver number", "Items", "Invoice value", "Paper copy", "Unloading paid to us", "Sale invoice", "Status"]}
        rows={lorries.map((l) => [
          l.invoiceNo ?? "",
          formatDate(l.invoiceDate),
          l.receivedOn ? formatDate(l.receivedOn) : "",
          firmName(l.firmId) ?? "",
          l.lorryNo,
          l.companyName,
          l.driverMobile ?? "",
          describeQuantities(l.lines, products),
          l.invoiceValue ? formatINR(l.invoiceValue) : "",
          l.invoicePaperKept ? "Yes" : "No",
          l.unloadingCharges ? "Yes" : "No",
          l.sale?.invoiceNo ?? "",
          lorryStateChip[lorryState(l)].label,
        ])}
      />
      {lorries.length === 0 && <SectionCard>{dates.kind === "all" ? "No lorry purchases yet." : "No lorry purchases for these dates."}</SectionCard>}
      {lorries.map((l) => (
        <SectionCard key={l.id} title={<LorryTitle lorry={l} />} action={<LorryStateChip lorry={l} />}>
          <LorryMeta lorry={l} firmName={firmName(l.firmId)} />
          <LorryItems lorry={l} products={products} />
          <LorryCost lorry={l} />
          <p className="mt-3 flex flex-wrap gap-3 text-[13px]">
            <Link href={`/sales/lorries/${l.id}`} className="text-link hover:underline">
              {l.sold ? "Lorry sale ›" : "Update the sale ›"}
            </Link>
            {l.purchaseId && (
              <Link href={`/purchases/${l.purchaseId}`} className="text-link hover:underline">
                Purchase ›
              </Link>
            )}
          </p>
          {isSavedLorry(l) && <ConfirmDelete what={`lorry ${l.lorryNo}`} onDelete={removeLorry.bind(null, l.id)} className="mt-3" />}
        </SectionCard>
      ))}
    </div>
  );
}
