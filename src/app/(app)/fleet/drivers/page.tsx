import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DetailList, ListSkeleton, SampleChip, SectionCard } from "@/components/ui/blocks";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { RoleGuard } from "@/components/ui/sub-nav";
import { getDrivers } from "@/lib/data";
import { formatBalance, formatDate, formatINR, formatShortDate } from "@/lib/format";

export const metadata: Metadata = { title: "Drivers" };

export default function DriversPage() {
  return (
    <>
      <PageHeader
        title="Drivers"
        subtitle="Our drivers' ledger (money given, spent and returned) and the lorry owners we hire from"
        actions={<SampleChip />}
      />
      <RoleGuard roles={["owner", "office"]}>
        <Suspense fallback={<ListSkeleton />}>
          <Drivers />
        </Suspense>
      </RoleGuard>
    </>
  );
}

const signed = (n: number) => (n >= 0 ? `+ ${formatINR(n)}` : `− ${formatINR(-n)}`);

async function Drivers() {
  const { own, rented } = await getDrivers();
  return (
    <div className="space-y-6">
      {own.map((d) => (
        <section key={d.id} className="space-y-3">
          <div className="grid gap-4 lg:grid-cols-3">
            <SectionCard title={d.name} className="lg:col-span-1">
              <p className="-mt-2 text-[13px] text-ink-secondary">{d.vehicle ? `Drives ${d.vehicle.number}` : "No fixed vehicle"}</p>
              <p className="mt-3 text-[13px] text-ink-secondary">Cash with the driver now</p>
              <p className="text-[34px] font-semibold leading-[41px] tracking-[-0.4px] tabular-nums text-ink">{formatINR(d.withDriver)}</p>
              <DetailList
                className="mt-3"
                items={[
                  { label: "Given this month", value: formatINR(d.advances) },
                  { label: "Spent (diesel, batta…)", value: formatINR(d.spent) },
                  { label: "Returned", value: formatINR(d.returned) },
                  { label: "Loan balance", value: d.loanBalance ? <span className="text-warning">{formatINR(d.loanBalance)}</span> : "None" },
                  { label: "Trips (2 weeks)", value: d.trips },
                ]}
              />
              <div className="mt-3 flex gap-4 text-[15px]">
                <Link href={`/money/cash/${d.id}`} className="text-link hover:underline">
                  Cash book ›
                </Link>
                <Link href={`/people/${d.id}`} className="text-link hover:underline">
                  Profile ›
                </Link>
              </div>
            </SectionCard>
            <div className="lg:col-span-2">
              <DataTable
                rows={[...d.entries].reverse().slice(0, 20)}
                rowKey={(e) => `${e.date}-${e.description}-${e.amount}`}
                mobile={(e) => ({ title: e.description, subtitle: formatShortDate(e.date), value: <span className={e.amount > 0 ? "text-good" : undefined}>{signed(e.amount)}</span> })}
                columns={[
                  { key: "date", header: "Date", cell: (e) => formatDate(e.date), className: "whitespace-nowrap text-ink-secondary" },
                  { key: "what", header: "Entry", cell: (e) => e.description },
                  { key: "amount", header: "Amount", align: "right", cell: (e) => <span className={e.amount > 0 ? "text-good" : undefined}>{signed(e.amount)}</span> },
                ]}
              />
            </div>
          </div>
        </section>
      ))}

      <SectionCard title="Hired lorries">
        <ul className="divide-y divide-hairline">
          {rented.map((r) => (
            <li key={r.id}>
              <Link href={`/parties/${r.id}`} className="flex items-center gap-3 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] text-ink">{r.name}</span>
                  <span className="block text-[12px] text-ink-secondary">
                    {r.vehicle.number} · {r.vehicle.model} · {r.vehicle.capacityMT} MT
                  </span>
                </span>
                <span className="text-right text-[15px] tabular-nums text-ink">
                  {formatBalance(r.balance)}
                  <span className="block text-[12px] text-ink-secondary">{r.balance < 0 ? "we owe" : "settled"}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
