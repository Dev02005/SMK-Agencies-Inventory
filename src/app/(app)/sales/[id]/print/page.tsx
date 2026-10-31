import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PrintButton } from "@/components/print/print-button";
import { Letterhead, PrintFooter, PrintSheet } from "@/components/print/print-sheet";
import { BackLink, ListSkeleton } from "@/components/ui/blocks";
import { getFirm, getParty, getProducts, getProfiles, getSale } from "@/lib/data";
import { formatDate, formatINR, rupeesInWords } from "@/lib/format";
import { transportLabels } from "@/lib/labels";
import { lineQty } from "@/lib/quantities";

export const metadata: Metadata = { title: "Print bill" };

export default function PrintSalePage({ params }: PageProps<"/sales/[id]/print">) {
  return (
    <Suspense fallback={<ListSkeleton rows={10} />}>
      <PrintBill params={params} />
    </Suspense>
  );
}

async function PrintBill({ params }: { params: PageProps<"/sales/[id]/print">["params"] }) {
  const { id } = await params;
  const sale = await getSale(id);
  if (!sale) notFound();
  const [firm, party, products, profiles] = await Promise.all([getFirm(), getParty(sale.partyId), getProducts(), getProfiles()]);
  const owner = profiles.find((p) => p.role === "owner")?.fullName ?? "";

  const charges = [
    { label: "Discount", value: -sale.discountAmount },
    { label: "Transport", value: sale.transportCharge },
    { label: "Unloading", value: sale.unloadingCharge },
    { label: "Other charges", value: sale.otherCharge },
  ].filter((c) => c.value !== 0);

  return (
    <div className="animate-fade-up">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <BackLink href={`/sales/${sale.id}`}>Bill {sale.billNo}</BackLink>
        <PrintButton label="Print bill" />
      </div>
      <PrintSheet>
        <Letterhead firm={firm} owner={owner} />
        <div className="px-6 py-6 md:px-10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-[#6e6e73]">Bill to</p>
              <p className="mt-1 text-[16px] font-semibold">{sale.partyName}</p>
              {party?.place && <p>{party.place}</p>}
              {party?.gstin && <p className="text-[#6e6e73]">GSTIN {party.gstin}</p>}
            </div>
            <div className="text-right">
              <h1 className="text-[20px] font-bold tracking-[-0.3px]">BILL</h1>
              <p>
                <span className="text-[#6e6e73]">No. </span>
                {sale.billNo}
              </p>
              <p>
                <span className="text-[#6e6e73]">Date </span>
                {formatDate(sale.billDate)}
              </p>
              {sale.paperMemo && (
                <p>
                  <span className="text-[#6e6e73]">Memo </span>
                  {sale.paperMemo}
                </p>
              )}
            </div>
          </div>

          <table className="mt-6 w-full border-collapse">
            <thead>
              <tr className="border-y border-[#d2d2d7] text-left text-[11px] uppercase tracking-wide text-[#6e6e73]">
                <th className="py-2 pr-2 font-medium">S.No</th>
                <th className="py-2 pr-2 font-medium">Product</th>
                <th className="py-2 pr-2 text-right font-medium">Quantity</th>
                <th className="py-2 pr-2 text-right font-medium">Rate</th>
                <th className="py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {sale.lines.map((l, i) => {
                const product = products.find((p) => p.id === l.productId);
                return (
                  <tr key={i} className="border-b border-[#e8e8ed]">
                    <td className="py-2.5 pr-2">{i + 1}</td>
                    <td className="py-2.5 pr-2">{product?.name}</td>
                    <td className="py-2.5 pr-2 text-right tabular-nums">{lineQty(l.qty, product)}</td>
                    <td className="py-2.5 pr-2 text-right tabular-nums">{formatINR(l.rate)}</td>
                    <td className="py-2.5 text-right tabular-nums">{formatINR(l.qty * l.rate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="ml-auto mt-3 w-full max-w-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[#6e6e73]">Items</span>
              <span className="tabular-nums">{formatINR(sale.subtotal)}</span>
            </div>
            {charges.map((c) => (
              <div key={c.label} className="flex justify-between">
                <span className="text-[#6e6e73]">{c.label}</span>
                <span className="tabular-nums">{c.value < 0 ? `− ${formatINR(-c.value)}` : formatINR(c.value)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-[#d2d2d7] pt-2 text-[16px] font-bold">
              <span>Total</span>
              <span className="tabular-nums">{formatINR(sale.total)}</span>
            </div>
          </div>
          <p className="mt-3 text-[12px] italic text-[#6e6e73]">{rupeesInWords(sale.total)}</p>

          <div className="mt-6 grid gap-1 text-[12px] text-[#6e6e73] sm:grid-cols-2">
            <p>Transport: {transportLabels[sale.transportMode]}</p>
            {sale.destination && <p>Destination: {sale.destination}</p>}
            {sale.remarks && <p className="sm:col-span-2">Remarks: {sale.remarks}</p>}
          </div>

          <div className="mt-12 flex justify-between text-[12px]">
            <p className="text-[#6e6e73]">Receiver&apos;s signature</p>
            <p className="font-medium">For {firm.name.toUpperCase()}</p>
          </div>
        </div>
        <PrintFooter />
      </PrintSheet>
    </div>
  );
}
