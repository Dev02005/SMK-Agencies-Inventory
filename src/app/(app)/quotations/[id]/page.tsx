import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PrintButton } from "@/components/print/print-button";
import { Letterhead, PrintFooter, PrintSheet } from "@/components/print/print-sheet";
import { BackLink, ListSkeleton } from "@/components/ui/blocks";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { getFirm, getProfiles, getQuotation } from "@/lib/data";
import { formatDate, formatINR, rupeesInWords } from "@/lib/format";
import { quotationStatus } from "@/lib/labels";

export const metadata: Metadata = { title: "Quotation" };

export default function QuotationPage({ params }: PageProps<"/quotations/[id]">) {
  return (
    <Suspense fallback={<ListSkeleton rows={10} />}>
      <QuotationDocument params={params} />
    </Suspense>
  );
}

/** Same layout as the firm's existing paper quotations (numbered like 12/2023-2024). */
async function QuotationDocument({ params }: { params: PageProps<"/quotations/[id]">["params"] }) {
  const { id } = await params;
  const quotation = await getQuotation(id);
  if (!quotation) notFound();
  const [firm, profiles] = await Promise.all([getFirm(), getProfiles()]);
  const owner = profiles.find((p) => p.role === "owner")?.fullName ?? "";
  const grandTotal = quotation.lines.reduce((s, l) => s + l.qty * l.rate, 0);
  const status = quotationStatus[quotation.status];

  const details = [
    ["Client's name", quotation.clientName, quotation.clientGstin],
    ["Site address", quotation.site],
    ["Contact no.", quotation.contact],
    ["E-mail", quotation.email],
  ].filter(([, value]) => value);

  return (
    <div className="animate-fade-up">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <BackLink href="/quotations">Quotations</BackLink>
          <Chip tone={status.tone}>{status.label}</Chip>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/sales/new">
            Convert to sale
          </ButtonLink>
          <PrintButton />
        </div>
      </div>

      <PrintSheet>
        <Letterhead firm={firm} owner={owner} />
        <div className="px-6 py-6 md:px-10">
          <h1 className="text-center text-[15px] font-bold underline underline-offset-4">QUOTATION</h1>

          <table className="mt-4 w-full border-collapse border border-[#d2d2d7]">
            <tbody>
              <tr className="border-b border-[#d2d2d7]">
                <th className="w-36 border-r border-[#d2d2d7] px-3 py-2 text-left font-normal text-[#6e6e73]">Quote no.</th>
                <td className="px-3 py-2 font-medium">{quotation.quoteNo}</td>
                <td className="w-32 border-l border-[#d2d2d7] px-3 py-2 text-right">{formatDate(quotation.date)}</td>
              </tr>
              {details.map(([label, value, extra]) => (
                <tr key={label} className="border-b border-[#d2d2d7] last:border-0">
                  <th className="border-r border-[#d2d2d7] px-3 py-2 text-left font-normal text-[#6e6e73]">{label}</th>
                  <td colSpan={2} className="px-3 py-2">
                    <span className={label === "Client's name" ? "font-semibold" : undefined}>{value}</span>
                    {extra && <span className="block font-semibold">{extra}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-5">Dear Sir,</p>
          <p className="mt-2 leading-relaxed">
            Thank you for contacting us. This is with reference to the prices of cement and steel selected by you. We hope you find
            our rates competitive and will oblige us with your valuable order.
          </p>

          <table className="mt-5 w-full border-collapse border border-[#d2d2d7]">
            <thead>
              <tr className="border-b border-[#d2d2d7] bg-[#f5f5f7] text-left text-[11px] uppercase tracking-wide text-[#6e6e73]">
                <th className="px-2 py-2 sm:px-3 font-medium">S.No.</th>
                <th className="px-2 py-2 sm:px-3 font-medium">Product name</th>
                <th className="px-2 py-2 sm:px-3 text-right font-medium">Quantity</th>
                <th className="px-2 py-2 sm:px-3 text-right font-medium">Price</th>
                <th className="px-2 py-2 sm:px-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {quotation.lines.map((l, i) => (
                <tr key={i} className="border-b border-[#e8e8ed]">
                  <td className="px-2 py-2.5 sm:px-3">{i + 1}</td>
                  <td className="px-2 py-2.5 sm:px-3">{l.description}</td>
                  <td className="px-2 py-2.5 sm:px-3 text-right tabular-nums">{l.qtyLabel}</td>
                  <td className="px-2 py-2.5 sm:px-3 text-right tabular-nums">{formatINR(l.rate)}</td>
                  <td className="px-2 py-2.5 sm:px-3 text-right tabular-nums">{formatINR(l.qty * l.rate)}</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td colSpan={4} className="px-2 py-2.5 sm:px-3 text-center">
                  GRAND TOTAL
                </td>
                <td className="px-2 py-2.5 sm:px-3 text-right tabular-nums">{formatINR(grandTotal)}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-2 text-[12px] italic text-[#6e6e73]">{rupeesInWords(grandTotal)}</p>

          <p className="mt-6 font-semibold underline underline-offset-4">TERMS AND CONDITIONS:</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            {quotation.terms.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ol>

          <p className="mt-6">Thanking you.</p>
          <p className="mt-1">Yours truly</p>
          <p className="mt-8 font-semibold">For {firm.name.toUpperCase()}</p>
          <p>Contact number: {firm.phone}</p>
        </div>
        <PrintFooter>Assuring the best of our services · Wholesale dealers in cement &amp; iron merchants</PrintFooter>
      </PrintSheet>
    </div>
  );
}
