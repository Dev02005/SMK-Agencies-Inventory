"use client";

import {
  Building2,
  Check,
  Copy,
  ExternalLink,
  MessageSquare,
  Send,
  Sparkles,
  Zap,
} from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field, inputClass } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { formatShortDate } from "@/lib/format";
import type { WhatsAppConfig, WhatsAppMessage } from "@/lib/whatsapp/types";
import {
  sendTestWhatsAppAction,
  simulateInboundBotAction,
  updateWhatsAppConfigAction,
} from "./actions";

export function WhatsAppCenter({
  initialConfig,
  initialMessages,
}: {
  initialConfig: WhatsAppConfig;
  initialMessages: WhatsAppMessage[];
}) {
  const toast = useToast();
  const [config, setConfig] = useState<WhatsAppConfig>(initialConfig);
  const [messages] = useState<WhatsAppMessage[]>(initialMessages);
  const [tab, setTab] = useState<"bot" | "templates" | "api" | "history">("bot");
  const [pending, startTransition] = useTransition();

  // Test sender state
  const [testMobile, setTestMobile] = useState("9441117278");
  const [testKind, setTestKind] = useState<"receipt" | "reminder" | "summary">("receipt");
  const [lastWaLink, setLastWaLink] = useState<string | null>(null);

  // Simulator state
  const [simQuery, setSimQuery] = useState("1");
  const [simSenderPhone, setSimSenderPhone] = useState("9441117278");
  const [simReply, setSimReply] = useState<string | null>(null);

  // Copy helper
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  function copyText(key: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast("Copied to clipboard");
    setTimeout(() => setCopiedKey(null), 2000);
  }

  // Save config patch
  function handleUpdate(patch: Partial<WhatsAppConfig>) {
    const next = { ...config, ...patch };
    setConfig(next);
    startTransition(async () => {
      const res = await updateWhatsAppConfigAction(patch);
      if (res.ok) {
        toast("WhatsApp settings saved");
      }
    });
  }

  // Send test message
  function handleSendTest() {
    startTransition(async () => {
      const res = await sendTestWhatsAppAction({
        mobile: testMobile,
        kind: testKind,
        name: "Test Customer",
      });
      if (res.ok) {
        setLastWaLink(res.waLink);
        toast(`Test ${testKind} dispatched successfully!`);
      } else {
        toast(`Error: ${res.error || "Failed to send"}`);
      }
    });
  }

  // Run simulator
  function handleSimulate() {
    startTransition(async () => {
      const res = await simulateInboundBotAction(simSenderPhone, simQuery);
      if (res.ok) {
        setSimReply(res.replyText);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* TOP HERO STATUS BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#061b17] via-[#0b2922] to-[#04120f] border border-[#144738]/50 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="size-13 rounded-2xl bg-gradient-to-tr from-[#16a34a] to-[#22c55e] p-0.5 shadow-md flex items-center justify-center shrink-0">
              <div className="size-full rounded-[14px] bg-[#07241c] flex items-center justify-center text-[#4ade80]">
                <MessageSquare className="size-7" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[20px] font-bold text-white tracking-tight">WhatsApp Bot &amp; Messaging</h2>
                <Chip tone={config.enabled ? "good" : "neutral"}>
                  {config.enabled ? "Active" : "Paused"}
                </Chip>
              </div>
              <p className="text-[13px] text-emerald-200/80 mt-1 max-w-xl">
                Automatic payment receipts, overdue payment reminders with UPI QR details, and an interactive 2-way Telugu &amp; English WhatsApp assistant for customers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleUpdate({ enabled: !config.enabled })}
              className={cn(
                "h-10 px-4 rounded-xl text-[13.5px] font-semibold transition-all cursor-pointer flex items-center gap-2",
                config.enabled
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                  : "bg-white/10 text-white hover:bg-white/15",
              )}
            >
              <Zap className="size-4" />
              {config.enabled ? "Bot Enabled" : "Enable Bot"}
            </button>
          </div>
        </div>

        {/* Quick Mode Indicator */}
        <div className="mt-5 pt-4 border-t border-emerald-900/40 flex flex-wrap items-center justify-between gap-3 text-[12.5px] text-emerald-300/80">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Mode: <strong className="text-white">{config.provider === "meta_cloud" ? "Meta WhatsApp Cloud API" : "Direct WhatsApp (wa.me 1-Click)"}</strong></span>
          </div>
          <div className="flex items-center gap-3">
            <span>Proprietor Mobile: <strong className="text-white">+91 {config.ownerMobile}</strong></span>
            <span>·</span>
            <span>UPI ID: <strong className="text-white">{config.upiId}</strong></span>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <Segmented
        label="WhatsApp Navigation"
        value={tab}
        onChange={(val) => setTab(val as typeof tab)}
        options={[
          { value: "bot", label: "Interactive Bot" },
          { value: "templates", label: "Reminders & Receipts" },
          { value: "api", label: "Meta Cloud API & Webhook" },
          { value: "history", label: `Message Logs (${messages.length})` },
        ]}
      />

      {/* TAB 1: INTERACTIVE BOT & SANDBOX */}
      {tab === "bot" && (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Column: Bot Settings & Features */}
          <div className="space-y-4 lg:col-span-7">
            <div className="surface p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-ink text-[16px]">2-Way WhatsApp Assistant</h3>
                  <p className="text-[13px] text-ink-secondary mt-0.5">
                    Replies instantly when customers or staff send messages to the agency number.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={config.botAutoReply}
                  onChange={(e) => handleUpdate({ botAutoReply: e.target.checked })}
                  className="size-5 rounded text-accent cursor-pointer"
                />
              </div>

              {/* Bot Capabilities List */}
              <div className="rounded-2xl border border-hairline bg-card-subtle p-4 space-y-3">
                <p className="text-[12px] font-bold text-ink-tertiary uppercase tracking-wider">
                  Supported Customer Commands
                </p>
                <div className="grid gap-2 sm:grid-cols-2 text-[13px]">
                  <div className="rounded-xl border border-hairline/80 bg-card p-2.5">
                    <span className="font-bold text-accent">1 or &quot;Balance&quot; (బాకీ)</span>
                    <p className="text-[12px] text-ink-secondary mt-0.5">Fetches customer&apos;s live balance from database</p>
                  </div>
                  <div className="rounded-xl border border-hairline/80 bg-card p-2.5">
                    <span className="font-bold text-good">2 or &quot;Receipt&quot; (రసీదు)</span>
                    <p className="text-[12px] text-ink-secondary mt-0.5">Shows last payment receipt date &amp; amount</p>
                  </div>
                  <div className="rounded-xl border border-hairline/80 bg-card p-2.5">
                    <span className="font-bold text-[#0284c7]">3 or &quot;Bank&quot; (ఖాతా)</span>
                    <p className="text-[12px] text-ink-secondary mt-0.5">Sends Axis Bank details &amp; UPI ID for payment</p>
                  </div>
                  <div className="rounded-xl border border-hairline/80 bg-card p-2.5">
                    <span className="font-bold text-warning">4 or &quot;Rates&quot; (ధరలు)</span>
                    <p className="text-[12px] text-ink-secondary mt-0.5">Current cement &amp; steel dealer brands</p>
                  </div>
                </div>
              </div>

              {/* Staff Features */}
              <div className="rounded-2xl border border-hairline bg-card-subtle p-4 space-y-2 text-[13px]">
                <p className="text-[12px] font-bold text-ink-tertiary uppercase tracking-wider">
                  Secret Staff &amp; Owner Keywords
                </p>
                <p className="text-ink-secondary">
                  When <strong>Kamesh Potnuru</strong> or staff message the bot:
                </p>
                <ul className="list-disc list-inside text-[12.5px] text-ink space-y-1 font-mono">
                  <li><strong className="font-sans text-accent">today</strong> → Today&apos;s sales &amp; cash collections summary</li>
                  <li><strong className="font-sans text-good">stock</strong> → Live godown stock balances for cement/steel</li>
                  <li><strong className="font-sans text-danger">due</strong> → Top outstanding customer accounts</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Right Column: Live Interactive Simulator */}
          <div className="space-y-4 lg:col-span-5">
            <div className="surface p-5 space-y-4 border-2 border-accent/20">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-accent" />
                <h3 className="font-semibold text-ink text-[16px]">Interactive Bot Sandbox</h3>
              </div>
              <p className="text-[12.5px] text-ink-secondary">
                Test how the bot replies in Telugu &amp; English to any customer command right now:
              </p>

              <div className="space-y-3">
                <Field label="Sender phone number" htmlFor="sim-sender">
                  <input
                    id="sim-sender"
                    value={simSenderPhone}
                    onChange={(e) => setSimSenderPhone(e.target.value)}
                    placeholder="9441117278"
                    className={inputClass}
                  />
                </Field>

                <Field label="Customer query / message" htmlFor="sim-query">
                  <div className="flex gap-2">
                    <input
                      id="sim-query"
                      value={simQuery}
                      onChange={(e) => setSimQuery(e.target.value)}
                      placeholder="e.g. 1, Balance, Rates, Receipt"
                      className={inputClass}
                    />
                    <Button onClick={handleSimulate} disabled={pending} className="shrink-0 gap-1.5">
                      <Send size={15} />
                      Test
                    </Button>
                  </div>
                </Field>

                {/* Quick preset chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {["1 (Balance)", "2 (Receipt)", "3 (Bank/UPI)", "4 (Rates)", "today", "menu"].map((cmd) => (
                    <button
                      key={cmd}
                      type="button"
                      onClick={() => {
                        setSimQuery(cmd.split(" ")[0]);
                        setSimReply(null);
                      }}
                      className="px-2.5 py-1 rounded-full text-[12px] bg-card-subtle border border-hairline hover:bg-hairline text-ink cursor-pointer"
                    >
                      {cmd}
                    </button>
                  ))}
                </div>

                {/* Reply Bubble */}
                {simReply && (
                  <div className="mt-4 rounded-2xl bg-[#0b2922] border border-[#144738] p-4 text-white text-[13px] font-sans whitespace-pre-wrap shadow-inner leading-relaxed animate-fade-in">
                    <div className="flex items-center justify-between text-[11px] text-emerald-400 mb-2 font-mono border-b border-emerald-900/60 pb-1.5">
                      <span>🤖 Bot Auto-Reply:</span>
                      <button
                        type="button"
                        onClick={() => copyText("reply", simReply)}
                        className="hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Copy size={12} /> {copiedKey === "reply" ? "Copied" : "Copy"}
                      </button>
                    </div>
                    {simReply}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REMINDERS & RECEIPTS CONFIG & TEST SENDER */}
      {tab === "templates" && (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Column: Bank Details for Reminders */}
          <div className="space-y-4 lg:col-span-7">
            <div className="surface p-5 space-y-4">
              <h3 className="font-semibold text-ink text-[16px] flex items-center gap-2">
                <Building2 className="size-5 text-accent" />
                Bank &amp; Payment Details on Reminders
              </h3>
              <p className="text-[13px] text-ink-secondary">
                These bank and UPI details are automatically included in every WhatsApp payment reminder sent to parties:
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Bank Name" htmlFor="w-bank">
                  <input
                    id="w-bank"
                    value={config.bankName}
                    onChange={(e) => handleUpdate({ bankName: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Account Number" htmlFor="w-ac">
                  <input
                    id="w-ac"
                    value={config.accountNo}
                    onChange={(e) => handleUpdate({ accountNo: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="IFSC Code" htmlFor="w-ifsc">
                  <input
                    id="w-ifsc"
                    value={config.ifsc}
                    onChange={(e) => handleUpdate({ ifsc: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="UPI ID (GPay / PhonePe)" htmlFor="w-upi">
                  <input
                    id="w-upi"
                    value={config.upiId}
                    onChange={(e) => handleUpdate({ upiId: e.target.value })}
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="pt-2 border-t border-hairline/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[14px] font-semibold text-ink">Automatic Receipt on Payment</p>
                    <p className="text-[12.5px] text-ink-secondary">
                      Prompt to send WhatsApp receipt immediately when staff record a receipt
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.sendReceiptsAutomatically}
                    onChange={(e) => handleUpdate({ sendReceiptsAutomatically: e.target.checked })}
                    className="size-5 rounded text-accent cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[14px] font-semibold text-ink">Daily Summary to Proprietor</p>
                    <p className="text-[12.5px] text-ink-secondary">
                      Send evening business sales &amp; collection summary to Kamesh Potnuru
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.sendDailySummaryToOwner}
                    onChange={(e) => handleUpdate({ sendDailySummaryToOwner: e.target.checked })}
                    className="size-5 rounded text-accent cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: 1-Click WhatsApp Test Dispatcher */}
          <div className="space-y-4 lg:col-span-5">
            <div className="surface p-5 space-y-4">
              <h3 className="font-semibold text-ink text-[16px] flex items-center gap-2">
                <Send className="size-5 text-good" />
                Test Send Message
              </h3>
              <p className="text-[12.5px] text-ink-secondary">
                Dispatch a real sample reminder or receipt to your WhatsApp phone:
              </p>

              <div className="space-y-3">
                <Field label="Mobile Number" htmlFor="test-phone">
                  <input
                    id="test-phone"
                    value={testMobile}
                    onChange={(e) => setTestMobile(e.target.value)}
                    placeholder="Enter 10-digit number"
                    className={inputClass}
                  />
                </Field>

                <Field label="Message Type" htmlFor="test-kind">
                  <select
                    id="test-kind"
                    value={testKind}
                    onChange={(e) => setTestKind(e.target.value as "receipt" | "reminder" | "summary")}
                    className={inputClass}
                  >
                    <option value="receipt">🧾 Payment Receipt (రసీదు)</option>
                    <option value="reminder">🔔 Payment Reminder with Bank details</option>
                    <option value="summary">📊 Daily Business Summary for Owner</option>
                  </select>
                </Field>

                <Button
                  variant="primary"
                  onClick={handleSendTest}
                  disabled={pending || !testMobile}
                  className="w-full h-11 justify-center gap-2 font-semibold"
                >
                  <Send size={16} />
                  Send Test WhatsApp Message
                </Button>

                {lastWaLink && (
                  <div className="rounded-2xl border border-good/30 bg-good-soft p-3.5 text-[13px] space-y-2">
                    <p className="font-semibold text-good flex items-center gap-1.5">
                      <Check size={16} /> Dispatched to queue!
                    </p>
                    <a
                      href={lastWaLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-bold text-good hover:underline text-[13.5px]"
                    >
                      Open in WhatsApp / Web <ExternalLink size={14} />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: META CLOUD API & WEBHOOK SETUP */}
      {tab === "api" && (
        <div className="surface p-5 space-y-6">
          <div>
            <h3 className="font-semibold text-ink text-[17px]">Meta WhatsApp Business Cloud API Configuration</h3>
            <p className="text-[13px] text-ink-secondary mt-0.5">
              Connect your official Meta WhatsApp Business Cloud API for automated background sending without requiring staff phones.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Sending Provider Mode" htmlFor="provider-mode">
              <select
                id="provider-mode"
                value={config.provider}
                onChange={(e) => handleUpdate({ provider: e.target.value as "click_to_chat" | "meta_cloud" })}
                className={inputClass}
              >
                <option value="click_to_chat">Direct WhatsApp (wa.me 1-Click - No API required)</option>
                <option value="meta_cloud">Meta WhatsApp Cloud API (Automated Server-Side)</option>
              </select>
            </Field>

            <Field label="Phone Number ID" htmlFor="phone-id" hint="From Meta WhatsApp App Dashboard">
              <input
                id="phone-id"
                value={config.phoneNumberId || ""}
                onChange={(e) => handleUpdate({ phoneNumberId: e.target.value })}
                placeholder="e.g. 1045521998372"
                className={inputClass}
              />
            </Field>

            <Field label="WhatsApp Business Account ID (WABA ID)" htmlFor="waba-id">
              <input
                id="waba-id"
                value={config.businessAccountId || ""}
                onChange={(e) => handleUpdate({ businessAccountId: e.target.value })}
                placeholder="e.g. 1098234710293"
                className={inputClass}
              />
            </Field>

            <Field label="Permanent Access Token" htmlFor="access-token">
              <input
                id="access-token"
                type="password"
                value={config.accessToken || ""}
                onChange={(e) => handleUpdate({ accessToken: e.target.value })}
                placeholder="EAA..."
                className={inputClass}
              />
            </Field>
          </div>

          {/* Webhook Settings Card */}
          <div className="rounded-2xl border border-hairline bg-card-subtle p-5 space-y-4">
            <h4 className="font-semibold text-ink text-[15px] flex items-center gap-2">
              <Zap className="size-4.5 text-accent" />
              Webhook Setup for 2-Way Bot
            </h4>
            <p className="text-[13px] text-ink-secondary">
              Paste these into your Meta App Developer Portal under <strong>WhatsApp › Configuration › Webhook</strong>:
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-[12px] font-bold text-ink-tertiary uppercase">Callback URL</label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    readOnly
                    value={typeof window !== "undefined" ? `${window.location.origin}/api/whatsapp/webhook` : config.webhookUrl}
                    className={cn(inputClass, "bg-card font-mono text-[13px]")}
                  />
                  <Button
                    variant="secondary"
                    onClick={() =>
                      copyText(
                        "webhook",
                        typeof window !== "undefined" ? `${window.location.origin}/api/whatsapp/webhook` : config.webhookUrl || "",
                      )
                    }
                    className="shrink-0"
                  >
                    <Copy size={15} /> {copiedKey === "webhook" ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-[12px] font-bold text-ink-tertiary uppercase">Verify Token</label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    value={config.verifyToken}
                    onChange={(e) => handleUpdate({ verifyToken: e.target.value })}
                    className={cn(inputClass, "font-mono text-[13px]")}
                  />
                  <Button
                    variant="secondary"
                    onClick={() => copyText("token", config.verifyToken || "")}
                    className="shrink-0"
                  >
                    <Copy size={15} /> {copiedKey === "token" ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MESSAGE LOGS & AUDIT TRAIL */}
      {tab === "history" && (
        <div className="surface divide-y divide-hairline overflow-hidden rounded-2xl">
          <div className="p-4 bg-card-subtle flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-ink text-[15px]">Outbound &amp; Inbound Message History</h3>
              <p className="text-[12px] text-ink-secondary">Audit log of reminders, receipts, and bot replies</p>
            </div>
            <span className="text-[12px] font-semibold text-ink-tertiary">{messages.length} messages</span>
          </div>

          {messages.length === 0 ? (
            <div className="p-8 text-center text-ink-secondary text-[14px]">
              No WhatsApp messages logged yet. Use the &quot;Test Send Message&quot; tab to send your first message.
            </div>
          ) : (
            <ul className="divide-y divide-hairline">
              {messages.map((m) => (
                <li key={m.id} className="p-4 hover:bg-card-subtle transition-colors flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Chip
                        tone={
                          m.kind === "receipt"
                            ? "good"
                            : m.kind === "reminder"
                              ? "warning"
                              : m.kind === "bot_reply"
                                ? "accent"
                                : "neutral"
                        }
                      >
                        {m.kind}
                      </Chip>
                      <strong className="text-[14px] text-ink">{m.recipientName}</strong>
                      <span className="text-[13px] text-ink-secondary font-mono">+91 {m.recipientMobile}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Chip tone={m.status === "delivered" || m.status === "sent" ? "good" : "danger"}>
                        {m.status}
                      </Chip>
                      <span className="text-[12px] text-ink-tertiary">
                        {formatShortDate(m.sentAt.slice(0, 10))}
                      </span>
                      {m.waLink && (
                        <a
                          href={m.waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-link text-[12px] hover:underline flex items-center gap-1 font-medium ml-1"
                        >
                          Open <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </div>

                  <p className="text-[13px] text-ink-secondary font-sans whitespace-pre-wrap rounded-xl bg-card p-3 border border-hairline/60">
                    {m.body}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
