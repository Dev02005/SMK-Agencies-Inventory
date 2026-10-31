import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ListSkeleton, SampleChip, StatCard, StatRow } from "@/components/ui/blocks";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { PageHeader } from "@/components/ui/page-header";
import { getCommitments } from "@/lib/data";
import { formatDate, formatINR, formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Advances" };

export default function AdvancesPage() {
  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Advances"
        subtitle="Money paid in advance, and cement bags committed at a fixed rate"
        actions={
          <>
            <SampleChip />
            <ButtonLink href="/money/advances/new">New advance</ButtonLink>
          </>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <Commitments />
      </Suspense>
    </div>
  );
}

async function Commitments() {
  const list = await getCommitments();
  const active = list.filter((c) => c.status === "active");
  const bagsLeft = active.reduce((s, c) => s + c.remainingBags, 0);

  return (
    <div className="space-y-4">
      <StatRow>
        <StatCard label="Advance still to adjust" value={formatINR(active.reduce((s, c) => s + c.remainingAmount, 0))} />
        <StatCard label="Committed bags to supply" value={`${formatNumber(bagsLeft)} bags`} hint={`${formatNumber(bagsLeft / 20)} MT`} tone="warning" />
        <StatCard label="Open advances" value={active.length} hint={`${list.length - active.length} completed`} />
      </StatRow>

      <ul className="grid gap-4 md:grid-cols-2">
        {list.map((c) => {
          const share = c.kind === "fixed_price" ? c.suppliedBags / (c.bags || 1) : c.adjusted / c.amount;
          return (
            <li key={c.id}>
              <Link href={`/money/advances/${c.id}`} className="surface block p-5 transition hover:shadow-raised md:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[17px] font-semibold tracking-[-0.3px] text-ink">{c.partyName}</p>
                    <p className="text-[13px] text-ink-secondary">
                      {c.kind === "fixed_price" ? `${formatNumber(c.bags ?? 0)} bags ${c.productName} at ${formatINR(c.rate ?? 0)}` : "Advance against future bills"} · {formatDate(c.date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Chip tone={c.status === "active" ? "accent" : "good"}>{c.status === "active" ? "Open" : "Completed"}</Chip>
                    <ChevronRight size={18} strokeWidth={1.75} className="text-ink-tertiary" aria-hidden />
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-hairline" role="img" aria-label={`${Math.round(share * 100)}% used`}>
                  <div className="h-full bg-good" style={{ width: `${Math.min(100, share * 100)}%` }} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-[13px]">
                  <div>
                    <p className="text-ink-secondary">Received</p>
                    <p className="tabular-nums text-ink">{formatINR(c.amount)}</p>
                  </div>
                  <div>
                    <p className="text-ink-secondary">{c.kind === "fixed_price" ? "Supplied" : "Adjusted"}</p>
                    <p className="tabular-nums text-ink">{c.kind === "fixed_price" ? `${formatNumber(c.suppliedBags)} bags` : formatINR(c.adjusted)}</p>
                  </div>
                  <div>
                    <p className="text-ink-secondary">Remaining</p>
                    <p className="font-medium tabular-nums text-ink">{c.kind === "fixed_price" ? `${formatNumber(c.remainingBags)} bags` : formatINR(c.remainingAmount)}</p>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
