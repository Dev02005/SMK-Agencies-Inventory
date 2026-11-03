"use client";

import { Truck } from "lucide-react";
import Link from "next/link";
import { SectionCard } from "@/components/ui/blocks";
import { Chip } from "@/components/ui/chip";
import { useDateFilter } from "@/components/ui/date-filter";
import { ExportTable } from "@/components/ui/export-table";
import type { Product } from "@/lib/data/types";
import { inDateFilter } from "@/lib/date-filter";
import { formatDate, formatINR } from "@/lib/format";
import { useLorryBook } from "@/lib/lorry-book";
import { lineQty } from "@/lib/quantities";

/** Lorries noted on this device with Lorry arrived (sample mode keeps them here until the database is connected). */
export function DeviceLorryPurchases({ products, firmNames, serverCount }: { products: Product[]; firmNames: Record<string, string>; serverCount: number }) {
  const dates = useDateFilter();
  const lorries = useLorryBook().filter((l) => inDateFilter(l.arrivedOn, dates));
  const product = (id: string) => products.find((p) => p.id === id);
  if (lorries.length === 0) {
    return serverCount === 0 ? <SectionCard>{dates.kind === "all" ? "No lorry purchases yet." : "No lorry purchases for these dates."}</SectionCard> : null;
  }
  return (
    <>
      <ExportTable
        title="Lorries noted on this device"
        columns={["Arrived", "Firm", "Lorry", "Company", "Driver", "Invoice", "Item", "Loaded", "Rate", "Amount"]}
        rows={lorries.flatMap((l) =>
          (l.lines ?? []).map((x) => [
            formatDate(l.arrivedOn),
            l.firmId ? firmNames[l.firmId] : "",
            l.lorryNo,
            l.companyName,
            l.driverName,
            l.invoiceNo,
            product(x.productId)?.name,
            lineQty(x.qty, product(x.productId)),
            x.rate ? formatINR(x.rate) : "",
            x.rate ? formatINR(x.rate * x.qty) : "",
          ]),
        )}
      />
      {lorries.map((l) => (
        <SectionCard
          key={l.id}
          title={
            <span className="flex items-center gap-2">
              <Truck size={20} strokeWidth={1.75} className="text-warning" aria-hidden />
              {l.lorryNo}
            </span>
          }
          action={<Chip tone={l.closed ? "good" : "warning"}>{l.closed ? "Sold out" : "Selling"}</Chip>}
        >
          <p className="-mt-2 text-[13px] text-ink-secondary">
            {l.companyName} · driver {l.driverName} · {l.invoiceNo ? `invoice ${l.invoiceNo}` : "no invoice number"} · arrived {formatDate(l.arrivedOn)}
          </p>
          {l.firmId && firmNames[l.firmId] && <p className="mt-1 text-[12px] font-medium text-accent">For {firmNames[l.firmId]}</p>}
          {l.lines?.length ? (
            <ul className="mt-3 divide-y divide-hairline">
              {l.lines.map((x) => (
                <li key={x.productId} className="flex justify-between gap-3 py-2 text-[15px]">
                  <span className="text-ink">{product(x.productId)?.name}</span>
                  <span className="text-right tabular-nums text-ink">
                    {lineQty(x.qty, product(x.productId))}
                    {x.rate ? <span className="block text-[12px] text-ink-secondary">× {formatINR(x.rate)} = {formatINR(x.rate * x.qty)}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[14px] text-ink-secondary">The bags on this lorry weren&apos;t noted when it arrived.</p>
          )}
          {l.lines?.some((x) => x.rate) && (
            <p className="mt-1 flex justify-between border-t border-hairline pt-2 text-[15px]">
              <span className="text-ink-secondary">{l.freight ? `Total with ${formatINR(l.freight)} freight` : "Total"}</span>
              <span className="font-semibold tabular-nums text-ink">{formatINR((l.lines ?? []).reduce((s, x) => s + (x.rate ?? 0) * x.qty, 0) + (l.freight ?? 0))}</span>
            </p>
          )}
          <p className="mt-2 text-[13px]">
            <Link href="/sales/lorries" className="text-link hover:underline">
              Lorry sales ›
            </Link>
          </p>
        </SectionCard>
      ))}
    </>
  );
}
