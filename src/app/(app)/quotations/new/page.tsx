import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { BackLink, ListSkeleton, SampleChip } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { getParties, getProducts, getQuotations, getQuotationTerms } from "@/lib/data";
import { todayISO } from "@/lib/format";
import { QuotationForm } from "./quotation-form";

export const metadata: Metadata = { title: "New quotation" };

export default function NewQuotationPage() {
  return (
    <div className="animate-fade-up mx-auto max-w-[760px]">
      <PageHeader back={<BackLink href="/quotations">Quotations</BackLink>} title="New quotation" actions={<SampleChip />} />
      <Suspense fallback={<ListSkeleton rows={8} />}>
        <FormForToday />
      </Suspense>
    </div>
  );
}

/** Indian financial year label for a date: 2026-10-26 → "2026-2027". */
function financialYear(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  const start = m >= 4 ? y : y - 1;
  return `${start}-${start + 1}`;
}

async function FormForToday() {
  await connection();
  const today = todayISO();
  const [parties, products, quotations, terms] = await Promise.all([getParties(), getProducts(), getQuotations(), getQuotationTerms()]);
  const fy = financialYear(today);
  const used = quotations.filter((q) => q.quoteNo.endsWith(fy)).map((q) => Number(q.quoteNo.split("/")[0]));
  const nextQuoteNo = `${String(Math.max(0, ...used) + 1).padStart(2, "0")}/${fy}`;
  const clients = parties
    .filter((p) => p.kind === "customer" || p.kind === "sub_dealer")
    .map((p) => ({ id: p.id, name: p.name, place: p.place, gstin: p.gstin, mobile: p.mobile, email: p.email }));

  return (
    <QuotationForm
      clients={clients}
      products={products.filter((p) => p.active)}
      today={today}
      quoteNo={nextQuoteNo}
      terms={terms}
    />
  );
}
