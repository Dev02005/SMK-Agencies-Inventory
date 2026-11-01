"use client";

import { Truck } from "lucide-react";
import { SectionCard } from "@/components/ui/blocks";
import { Chip } from "@/components/ui/chip";
import type { Product } from "@/lib/data/types";
import { formatDate } from "@/lib/format";
import { useLorryBook } from "@/lib/lorry-book";
import { LoadLines } from "./load-lines";

/** Lorries noted on this device with Lorry arrived that are still selling, with what came on them. */
export function DeviceLorryStock({ products, serverCount }: { products: Product[]; serverCount: number }) {
  const lorries = useLorryBook().filter((l) => !l.closed);
  if (lorries.length === 0) return serverCount === 0 ? <SectionCard>No lorry is selling right now.</SectionCard> : null;
  return (
    <>
      {lorries.map((l) => (
        <SectionCard
          key={l.id}
          title={
            <span className="flex items-center gap-2">
              <Truck size={20} strokeWidth={1.75} className="text-warning" aria-hidden />
              {l.lorryNo}
            </span>
          }
          action={<Chip tone="warning">Selling</Chip>}
        >
          <p className="-mt-2 text-[13px] text-ink-secondary">
            {l.companyName} · arrived {formatDate(l.arrivedOn)}
          </p>
          {l.lines?.length ? (
            <>
              {/* Bills aren't saved in sample mode, so nothing has come off these lorries yet. */}
              <LoadLines lines={l.lines.map((x) => ({ productId: x.productId, loaded: x.qty, sold: 0, left: x.qty }))} products={products} />
              <p className="mt-3 text-[13px] text-ink-secondary">Sample mode: bills aren&apos;t saved yet, so these don&apos;t go down when you sell.</p>
            </>
          ) : (
            <p className="mt-3 text-[14px] text-ink-secondary">The bags on this lorry weren&apos;t noted when it arrived.</p>
          )}
        </SectionCard>
      ))}
    </>
  );
}
