"use client";

import { Send } from "lucide-react";
import { useId, useRef, useState } from "react";
import { SectionCard } from "@/components/ui/blocks";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { AffixInput, Field, inputClass } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { sampleSaveMessage, useToast } from "@/components/ui/toast";
import { Select } from "@/components/ui/select";
import { TimeSelect } from "@/components/ui/time-select";
import { cn } from "@/lib/cn";
import type { Firm, ReminderRules, ReminderTemplate } from "@/lib/data/types";
import { formatDate, formatNumber } from "@/lib/format";

export type ReminderPreview = {
  partyId: string;
  party: string;
  amount: number;
  balance: number;
  days: number;
  billNo: string;
  billDate: string;
  staff: string;
};

const variables = [
  { key: "party", label: "Party name" },
  { key: "amount", label: "Amount due" },
  { key: "balance", label: "Total balance" },
  { key: "days", label: "Days pending" },
  { key: "bill_no", label: "Bill no." },
  { key: "bill_date", label: "Bill date" },
  { key: "staff", label: "Staff name" },
  { key: "firm", label: "Firm name" },
  { key: "phone", label: "Firm phone" },
] as const;

const stageLabels: Record<ReminderTemplate["stage"], string> = {
  first: "Goes first, once a bill passes the first-reminder days",
  repeat: "Goes each repeat until the last reminder",
  final: "Goes as the last reminder",
  thanks: "Goes when a payment is recorded",
};

function fill(body: string, p: ReminderPreview | undefined, firm: Firm) {
  const values: Record<string, string> = {
    party: p?.party ?? "",
    amount: p ? formatNumber(p.amount) : "",
    balance: p ? formatNumber(p.balance) : "",
    days: p ? String(p.days) : "",
    bill_no: p?.billNo ?? "",
    bill_date: p?.billDate ? formatDate(p.billDate) : "",
    staff: p?.staff ?? "",
    firm: firm.name,
    phone: firm.phone,
  };
  return body.replace(/\{(\w+)\}/g, (m, k: string) => values[k] ?? m);
}

/** SMS length: plain English fits 160 characters (153 per part when split); ₹ or Telugu switch to 70 (67 per part). */
function smsParts(text: string) {
  const unicode = /[^\x00-\x7F]/.test(text);
  const [single, multi] = unicode ? [70, 67] : [160, 153];
  const parts = text.length <= single ? 1 : Math.ceil(text.length / multi);
  return { parts, unicode };
}

export function ReminderSettings({
  templates: initialTemplates,
  rules: initialRules,
  previews,
  firm,
}: {
  templates: ReminderTemplate[];
  rules: ReminderRules;
  previews: ReminderPreview[];
  firm: Firm;
}) {
  const id = useId();
  const toast = useToast();
  const [rules, setRules] = useState(initialRules);
  const [templates, setTemplates] = useState(initialTemplates);
  const [selectedId, setSelectedId] = useState(initialTemplates[0]?.id);
  const [previewId, setPreviewId] = useState(previews[0]?.partyId);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const t = templates.find((x) => x.id === selectedId) ?? templates[0];
  const preview = previews.find((p) => p.partyId === previewId);
  const update = (patch: Partial<ReminderTemplate>) => setTemplates((cur) => cur.map((x) => (x.id === t.id ? { ...x, ...patch } : x)));
  const setRule = <K extends keyof ReminderRules>(key: K, value: ReminderRules[K]) => setRules((cur) => ({ ...cur, [key]: value }));
  const num = (v: string) => Math.max(0, Math.floor(Number(v) || 0));

  const unknown = [...t.body.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).filter((k) => !variables.some((v) => v.key === k));
  const filled = fill(t.body, preview, firm);
  const sms = smsParts(filled);
  const lastDay = rules.firstAfterDays + rules.repeatEveryDays * Math.max(0, rules.stopAfter - 1);

  function insert(key: string) {
    const el = bodyRef.current;
    const token = `{${key}}`;
    const start = el?.selectionStart ?? t.body.length;
    const end = el?.selectionEnd ?? t.body.length;
    update({ body: t.body.slice(0, start) + token + t.body.slice(end) });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  return (
    <div className="space-y-6">
      <SectionCard title="When reminders go">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            toast(sampleSaveMessage("reminder rules"));
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First reminder after" htmlFor={`${id}-first`} hint="Days after the bill date">
              <AffixInput id={`${id}-first`} inputMode="numeric" suffix="days" value={rules.firstAfterDays} onChange={(e) => setRule("firstAfterDays", num(e.target.value))} />
            </Field>
            <Field label="Then repeat every" htmlFor={`${id}-repeat`}>
              <AffixInput id={`${id}-repeat`} inputMode="numeric" suffix="days" value={rules.repeatEveryDays} onChange={(e) => setRule("repeatEveryDays", num(e.target.value) || 1)} />
            </Field>
            <Field label="Stop after" htmlFor={`${id}-stop`} hint="After this the party shows in the owner's follow-up list instead">
              <AffixInput id={`${id}-stop`} inputMode="numeric" suffix="times" value={rules.stopAfter} onChange={(e) => setRule("stopAfter", num(e.target.value) || 1)} />
            </Field>
            <Field label="Send at" htmlFor={`${id}-time`}>
              <TimeSelect id={`${id}-time`} label="Send at" value={rules.sendAt} onChange={(v) => setRule("sendAt", v)} />
            </Field>
            <Field label="Skip parties owing less than" htmlFor={`${id}-min`}>
              <AffixInput id={`${id}-min`} inputMode="numeric" prefix="₹" value={rules.minimumAmount} onChange={(e) => setRule("minimumAmount", num(e.target.value))} />
            </Field>
          </div>
          <div className="divide-y divide-hairline border-y border-hairline">
            <Switch label="Skip Sundays" hint="Sunday reminders go on Monday instead" checked={rules.skipSundays} onChange={(v) => setRule("skipSundays", v)} />
            <Switch label="Send SMS if WhatsApp fails" hint="For numbers not on WhatsApp" checked={rules.smsIfWhatsappFails} onChange={(v) => setRule("smsIfWhatsappFails", v)} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-ink-secondary">
              Reminders go {rules.firstAfterDays} days after the bill
              {rules.stopAfter > 1 && `, then every ${rules.repeatEveryDays} days up to day ${lastDay}`} ({rules.stopAfter} in all), at {rules.sendAt}.
            </p>
            <Button type="submit">Save rules</Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Messages">
        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <ul className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 md:-mx-6 md:px-6 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0" aria-label="Message templates">
            {templates.map((x) => (
              <li key={x.id} className="shrink-0">
                <button
                  type="button"
                  aria-current={x.id === t.id ? "true" : undefined}
                  onClick={() => setSelectedId(x.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left text-[15px] transition-colors",
                    x.id === t.id ? "bg-accent-soft font-medium text-accent" : "border border-hairline text-ink hover:bg-card-subtle lg:border-transparent",
                  )}
                >
                  <span className="whitespace-nowrap">{x.name}</span>
                  {!x.active && <span className="text-[12px] font-normal text-ink-secondary">Off</span>}
                </button>
              </li>
            ))}
          </ul>

          <form
            className="min-w-0 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (unknown.length || !t.body.trim()) return;
              toast(sampleSaveMessage(`"${t.name}" message`));
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" htmlFor={`${id}-name`} hint={stageLabels[t.stage]}>
                <input id={`${id}-name`} className={inputClass} value={t.name} onChange={(e) => update({ name: e.target.value })} />
              </Field>
              <div>
                <p className="mb-1.5 text-[13px] text-ink-secondary" aria-hidden>
                  Send by
                </p>
                <Segmented
                  label="Send by"
                  value={t.channel}
                  onChange={(channel) => update({ channel })}
                  options={[
                    { value: "whatsapp", label: "WhatsApp" },
                    { value: "sms", label: "SMS" },
                  ]}
                />
              </div>
            </div>

            <Switch label="Use this message" checked={t.active} onChange={(active) => update({ active })} className="border-y border-hairline" />

            <Field
              label="Message"
              htmlFor={`${id}-body`}
              error={unknown.length ? `Unknown ${unknown.length === 1 ? "field" : "fields"}: ${unknown.map((k) => `{${k}}`).join(", ")}` : !t.body.trim() ? "Write the message" : undefined}
              hint={
                t.channel === "sms"
                  ? `${filled.length} characters · ${sms.parts} SMS${sms.unicode ? ". ₹ or Telugu letters make each SMS 70 characters; write Rs. to fit more" : ""}`
                  : `${filled.length} characters`
              }
            >
              <textarea
                id={`${id}-body`}
                ref={bodyRef}
                rows={5}
                lang={t.language === "te" ? "te" : "en"}
                className={cn(inputClass, "h-auto py-3 text-[16px] leading-[23px]")}
                value={t.body}
                onChange={(e) => update({ body: e.target.value })}
              />
            </Field>

            <div>
              <p className="mb-2 text-[13px] text-ink-secondary">Tap to add a field at the cursor</p>
              <div className="flex flex-wrap gap-2">
                {variables.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => insert(v.key)}
                    className="h-8 rounded-full border border-hairline bg-card px-3 text-[13px] text-ink-secondary hover:border-accent hover:text-accent"
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-card-subtle p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] font-medium text-ink-secondary">Preview</p>
                <div className="flex items-center gap-2 text-[13px] text-ink-secondary">
                  <span aria-hidden>For</span>
                  <Select
                    aria-label="Preview for"
                    size="pill"
                    className="max-w-[220px]"
                    value={previewId ?? ""}
                    onChange={setPreviewId}
                    options={previews.map((p) => ({ value: p.partyId, label: p.party }))}
                  />
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div
                  lang={t.language === "te" ? "te" : "en"}
                  className={cn(
                    "max-w-[440px] whitespace-pre-wrap rounded-2xl rounded-tl-md px-4 py-3 text-[15px] leading-[21px] text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)]",
                    t.channel === "whatsapp" ? "bg-good-soft" : "bg-card",
                  )}
                >
                  {filled}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Chip tone={t.channel === "whatsapp" ? "good" : "neutral"}>{t.channel === "whatsapp" ? "WhatsApp" : "SMS"}</Chip>
                {t.language === "te" && <Chip tone="accent">Telugu</Chip>}
                {!t.active && <Chip>Off</Chip>}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => toast(`Sample mode: a test ${t.channel === "whatsapp" ? "WhatsApp" : "SMS"} to ${firm.phone} was checked but not sent. Sending starts once a provider is connected.`)}
              >
                <Send size={17} strokeWidth={1.75} aria-hidden />
                Send me a test
              </Button>
              <Button type="submit" disabled={unknown.length > 0 || !t.body.trim()}>
                Save message
              </Button>
            </div>
          </form>
        </div>
      </SectionCard>
    </div>
  );
}
