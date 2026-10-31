import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ListSkeleton, SampleChip, StatCard, StatRow } from "@/components/ui/blocks";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Today } from "@/components/ui/today";
import { getCashSummary } from "@/lib/data";
import { formatINR } from "@/lib/format";
import { roleLabels } from "@/lib/labels";
import { CountChip } from "./count-chip";

export const metadata: Metadata = { title: "Staff cash" };

export default function StaffCashPage() {
  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Staff cash"
        subtitle={<>Opening + cash in − cash out = closing · <Today fallback="today" /></>}
        actions={
          <>
            <SampleChip />
            <ButtonLink href="/money/cash/handover/new">Hand over cash</ButtonLink>
          </>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <CashSummary />
      </Suspense>
    </div>
  );
}

async function CashSummary() {
  const holders = await getCashSummary();
  const withStaff = holders.filter((h) => h.holder !== "office").reduce((s, h) => s + h.closing, 0);
  const office = holders.find((h) => h.holder === "office");
  const short = holders.filter((h) => (h.difference ?? 0) < 0);

  return (
    <div className="space-y-4">
      <StatRow>
        <StatCard label="With staff now" value={formatINR(withStaff)} />
        <StatCard label="Office cash box" value={formatINR(office?.closing ?? 0)} />
        <StatCard label="Short at count" value={short.length} tone={short.length ? "danger" : "good"} hint={short.length ? short.map((h) => h.name).join(", ") : "all matched"} />
      </StatRow>

      <ul className="grid gap-4 md:grid-cols-2">
        {holders.map((h) => (
          <li key={h.holder}>
            <Link href={`/money/cash/${h.holder}`} className="surface block p-5 transition hover:shadow-raised md:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[17px] font-semibold tracking-[-0.3px] text-ink">{h.name}</p>
                  <p className="text-[13px] text-ink-secondary">{h.holder === "office" ? "Office cash box" : roleLabels[h.role]}</p>
                </div>
                <ChevronRight size={18} strokeWidth={1.75} className="mt-1 text-ink-tertiary" aria-hidden />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-[13px]">
                <div>
                  <p className="text-ink-secondary">Opening</p>
                  <p className="tabular-nums text-ink">{formatINR(h.opening)}</p>
                </div>
                <div>
                  <p className="text-ink-secondary">In</p>
                  <p className="tabular-nums text-good">+ {formatINR(h.cashIn)}</p>
                </div>
                <div>
                  <p className="text-ink-secondary">Out</p>
                  <p className="tabular-nums text-ink">− {formatINR(h.cashOut)}</p>
                </div>
              </div>
              <div className="mt-4 flex items-end justify-between border-t border-hairline pt-3">
                <div>
                  <p className="text-[13px] text-ink-secondary">Closing</p>
                  <p className="text-[28px] font-semibold tabular-nums tracking-[-0.4px] text-ink">{formatINR(h.closing)}</p>
                </div>
                <CountChip counted={h.counted} difference={h.difference} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
