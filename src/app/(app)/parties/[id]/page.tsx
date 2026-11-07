import { MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BackLink, DetailList, ListSkeleton, SampleChip, SectionCard } from "@/components/ui/blocks";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { PageHeader } from "@/components/ui/page-header";
import { SampleActionButton } from "@/components/ui/sample-action";
import { cn } from "@/lib/cn";
import { getParty, getPartyAgeing, getPartyLedger, getProfile } from "@/lib/data";
import { formatBalance, formatINR } from "@/lib/format";
import { partyKindLabels } from "@/lib/labels";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { removeParty } from "../actions";
import { LedgerView } from "./ledger-view";

export const metadata: Metadata = { title: "Party" };

export default function PartyPage({ params }: PageProps<"/parties/[id]">) {
  return (
    <div className="animate-fade-up">
      <BackLink href="/parties">Parties</BackLink>
      <Suspense fallback={<ListSkeleton rows={8} />}>
        <PartyDetail params={params} />
      </Suspense>
    </div>
  );
}

const bucketTone = { "0-7": "bg-accent", "8-30": "bg-accent/60", "31-60": "bg-warning", "61-90": "bg-danger/70", "90+": "bg-danger" };

async function PartyDetail({ params }: { params: PageProps<"/parties/[id]">["params"] }) {
  const { id } = await params;
  const party = await getParty(id);
  if (!party) notFound();
  const [ledger, ageing, staff] = await Promise.all([getPartyLedger(id), getPartyAgeing(id), getProfile(party.assignedTo)]);

  const isSupplier = party.kind === "company" || party.kind === "lorry_owner";
  const limit = party.creditLimit;
  const used = limit ? Math.min(100, (Math.max(party.balance, 0) / limit) * 100) : 0;
  const over = limit !== null && party.balance > limit;
  const ageingTotal = Object.values(ageing).reduce((s, v) => s + v, 0);

  return (
    <>
      <PageHeader
        title={party.name}
        subtitle={[party.place, partyKindLabels[party.kind], party.gstin && `GSTIN ${party.gstin}`].filter(Boolean).join(" · ")}
        actions={
          <>
            <SampleChip />
            <SampleActionButton variant="secondary" message={`Statement for ${party.name} shared successfully.`}>
              Share statement
            </SampleActionButton>
            {isSupplier ? (
              <ButtonLink href="/money/payments/new">New payment</ButtonLink>
            ) : (
              <ButtonLink href="/sales/new">New sale</ButtonLink>
            )}
          </>
        }
      />
      {party.original && <ConfirmDelete what={party.name} onDelete={removeParty.bind(null, party.id)} after="/parties" className="-mt-2 mb-4" />}

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title={isSupplier ? "We owe" : "Balance"}>
          <p className={cn("text-[34px] font-semibold leading-[41px] tracking-[-0.4px] tabular-nums", over ? "text-danger" : "text-ink")}>
            {formatBalance(party.balance)}
          </p>
          {limit !== null && (
            <>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-hairline" role="img" aria-label={`${Math.round(used)}% of credit limit used`}>
                <div className={over ? "h-full bg-danger" : "h-full bg-accent"} style={{ width: `${used}%` }} />
              </div>
              <p className="mt-2 text-[13px] text-ink-secondary">
                Limit {formatINR(limit)} ·{" "}
                {over ? (
                  <span className="text-danger">over by {formatINR(party.balance - limit)}</span>
                ) : (
                  `${formatINR(limit - Math.max(party.balance, 0))} available`
                )}
              </p>
            </>
          )}
          {party.kind === "cash" && <p className="mt-2 text-[13px] text-ink-secondary">Walk-in sales, paid on the spot.</p>}
        </SectionCard>

        <SectionCard title="Ageing" action={party.overdue30 > 0 && <Chip tone="warning">{formatINR(party.overdue30)} over 30 days</Chip>}>
          {ageingTotal === 0 ? (
            <p className="py-2 text-[15px] text-ink-secondary">Nothing unpaid.</p>
          ) : (
            <ul className="space-y-2.5">
              {(Object.keys(ageing) as (keyof typeof ageing)[]).map((bucket) => (
                <li key={bucket} className="grid grid-cols-[72px_1fr_auto] items-center gap-3 text-[13px]">
                  <span className="text-ink-secondary">{bucket} days</span>
                  <span className="h-2 overflow-hidden rounded-full bg-hairline">
                    <span
                      className={cn("block h-full", bucketTone[bucket])}
                      style={{ width: `${(ageing[bucket] / ageingTotal) * 100}%` }}
                    />
                  </span>
                  <span className="text-right tabular-nums text-ink">{formatINR(ageing[bucket])}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Details">
          <div className="mb-2 flex gap-2">
            <a
              href={party.mobile ? `tel:+91${party.mobile}` : undefined}
              aria-disabled={!party.mobile}
              className={cn(
                "flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-accent-soft text-[15px] text-accent",
                !party.mobile && "pointer-events-none opacity-40",
              )}
            >
              <Phone size={16} strokeWidth={1.75} aria-hidden /> Call
            </a>
            <a
              href={
                party.mobile
                  ? `https://wa.me/91${party.mobile}?text=${encodeURIComponent(
                      party.balance > 0
                        ? `నమస్కారం ${party.name} గారు, Sri Kameswari Agencies (Polaki) నుండి. మీ ఖాతా బకాయి మొత్తం ₹${formatINR(party.balance)}. దయచేసి Axis Bank ఖాతా 924020054321001 (IFSC: UTIB0000456) లేదా UPI ID: kameshpotnuru@okaxis ద్వారా చెల్లించగలరు. ధన్యవాదాలు! - Kamesh Potnuru (9441117278)`
                        : `నమస్కారం ${party.name} గారు, Sri Kameswari Agencies (Polaki) నుండి. మీ ఖాతాలో ఎలాంటి బకాయి లేదు. ధన్యవాదాలు!`,
                    )}`
                  : undefined
              }
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!party.mobile}
              className={cn(
                "flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-good-soft text-[15px] text-good hover:opacity-90",
                !party.mobile && "pointer-events-none opacity-40",
              )}
            >
              <MessageCircle size={16} strokeWidth={1.75} aria-hidden /> WhatsApp Reminder
            </a>
          </div>
          <DetailList
            items={[
              { label: "Mobile", value: party.mobile ?? <span className="text-ink-tertiary">Not added</span> },
              { label: "Staff", value: staff?.fullName },
              { label: "GSTIN", value: party.gstin },
              { label: "Opening balance", value: formatBalance(party.openingBalance) },
            ]}
          />
        </SectionCard>
      </div>

      <div className="mt-4">
        <LedgerView entries={ledger} partyName={party.name} />
      </div>
    </>
  );
}
