"use client";

import { Check, Copy, ExternalLink, MessageSquare, Send, X } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { formatINR } from "@/lib/format";

export function SendReminderDialog({
  partyId,
  partyName,
  partyMobile,
  balance,
  overdueDays,
  firmName = "Sri Kameswari Agencies",
  firmPhone = "9441117278",
  onClose,
}: {
  partyId: string;
  partyName: string;
  partyMobile?: string;
  balance: number;
  overdueDays?: number;
  firmName?: string;
  firmPhone?: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const [mobile, setMobile] = useState(partyMobile ?? "");
  const [pending, startTransition] = useTransition();

  const cleanPhone = mobile.replace(/\D/g, "").slice(-10);

  const previewMessage = `🔔 *PAYMENT REMINDER / చెల్లింపు రిమైండర్*
━━━━━━━━━━━━━━━━━━━
*${firmName}*
Polaki, Srikakulam Dist.

నమస్కారం *${partyName}* గారు,
మీ ఖాతా బకాయి వివరాలు:

• *Total Outstanding:* *₹${formatINR(balance)}*${overdueDays ? `\n• *Overdue Period:* ${overdueDays} days` : ""}

దయచేసి క్రింది బ్యాంక్ ఖాతా లేదా UPI ద్వారా చెల్లించగలరు:
🏦 *Bank:* Axis Bank, Srikakulam Branch
🔢 *A/C No:* \`924020054321001\`
🏛️ *IFSC:* \`UTIB0000456\`
📱 *UPI ID:* \`kameshpotnuru@okaxis\`

_చెల్లించిన తర్వాత రసీదు లేదా స్క్రీన్‌షాట్ పంపగలరు._
📞 సంప్రదించండి: *${firmPhone}* / 99636 84551
━━━━━━━━━━━━━━━━━━━
_Sri Kameswari Agencies · Polaki_`;

  const waLink = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(previewMessage)}`;

  function handleSend() {
    if (!cleanPhone) {
      toast("Please enter a valid 10-digit mobile number.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reminder",
            params: {
              partyId,
              partyName,
              partyMobile: cleanPhone,
              balance,
              overdueDays,
            },
          }),
        });

        const json = await res.json();
        if (json.ok) {
          toast("WhatsApp reminder sent!");
          window.open(json.waLink || waLink, "_blank", "noopener,noreferrer");
          onClose();
        } else {
          toast(json.error || "Failed to dispatch WhatsApp message");
        }
      } catch {
        window.open(waLink, "_blank", "noopener,noreferrer");
        onClose();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="surface max-w-[500px] w-full p-6 space-y-4 rounded-3xl shadow-2xl border border-hairline animate-fade-in">
        <div className="flex items-center justify-between pb-3 border-b border-hairline">
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-xl bg-warning-soft text-warning flex items-center justify-center">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="font-bold text-ink text-[16px]">Send Payment Reminder</h3>
              <p className="text-[12.5px] text-ink-secondary">{partyName} · Due ₹{formatINR(balance)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-full text-ink-secondary hover:bg-card-subtle flex items-center justify-center cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-bold text-ink-tertiary uppercase tracking-wider block mb-1">
              Customer WhatsApp Mobile
            </label>
            <div className="flex gap-2">
              <span className="h-10 px-3 rounded-xl bg-card-subtle border border-hairline flex items-center text-[13px] font-semibold text-ink-secondary">
                +91
              </span>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="10-digit mobile number"
                className="flex-1 h-10 px-3 rounded-xl border border-hairline bg-card text-[14px] text-ink focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-ink-tertiary uppercase tracking-wider block mb-1">
              Message Preview
            </label>
            <div className="rounded-2xl bg-card-subtle p-3.5 text-[12.5px] font-sans whitespace-pre-wrap text-ink-secondary border border-hairline/80 max-h-56 overflow-y-auto leading-relaxed">
              {previewMessage}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSend}
            disabled={pending || !cleanPhone}
            className="gap-2 bg-[#0284c7] hover:bg-[#0369a1] text-white"
          >
            <Send size={15} />
            {pending ? "Sending..." : "Send Reminder on WhatsApp"}
          </Button>
        </div>
      </div>
    </div>
  );
}
