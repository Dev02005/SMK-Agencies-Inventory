"use server";

import { revalidatePath } from "next/cache";
import { getParties } from "@/lib/data";
import { processInboundWhatsAppMessage } from "@/lib/whatsapp/bot";
import {
  getWhatsAppConfig,
  saveWhatsAppConfig,
  sendDailySummaryWhatsApp,
  sendReceiptWhatsApp,
  sendReminderWhatsApp,
  sendWhatsAppMessage,
} from "@/lib/whatsapp/service";
import type { WhatsAppConfig } from "@/lib/whatsapp/types";

export async function updateWhatsAppConfigAction(patch: Partial<WhatsAppConfig>) {
  const updated = await saveWhatsAppConfig(patch);
  revalidatePath("/settings/whatsapp");
  revalidatePath("/settings/reminders");
  return { ok: true, config: updated };
}

export async function sendTestWhatsAppAction({
  mobile,
  name,
  kind,
  customBody,
}: {
  mobile: string;
  name?: string;
  kind: "receipt" | "reminder" | "summary" | "bot_reply" | "custom";
  customBody?: string;
}) {
  const recipientName = name || "Valued Customer";

  if (kind === "receipt") {
    const res = await sendReceiptWhatsApp({
      receiptNo: 1042,
      partyId: "test-party",
      partyName: recipientName,
      partyMobile: mobile,
      amount: 45000,
      mode: "upi",
      date: new Date().toISOString().slice(0, 10),
      balanceAfter: 12500,
      remarks: "Payment received for 100 bags Deccan PPC",
    });
    revalidatePath("/settings/whatsapp");
    return res;
  }

  if (kind === "reminder") {
    const res = await sendReminderWhatsApp({
      partyId: "test-party",
      partyName: recipientName,
      partyMobile: mobile,
      balance: 85000,
      overdueDays: 18,
    });
    revalidatePath("/settings/whatsapp");
    return res;
  }

  if (kind === "summary") {
    const res = await sendDailySummaryWhatsApp({ recipientMobile: mobile });
    revalidatePath("/settings/whatsapp");
    return res;
  }

  const res = await sendWhatsAppMessage({
    recipientMobile: mobile,
    recipientName,
    kind: "custom",
    body: customBody || "Hello from Sri Kameswari Agencies! Your WhatsApp notification service is connected.",
  });

  revalidatePath("/settings/whatsapp");
  return res;
}

/**
 * Interactive Bot Sandbox Simulator:
 * Tests how the bot would respond to an inbound message from a given mobile number.
 */
export async function simulateInboundBotAction(fromMobile: string, messageText: string) {
  const config = await getWhatsAppConfig();
  const botReply = await processInboundWhatsAppMessage(fromMobile, messageText, config);
  return { ok: true, ...botReply };
}

/**
 * Batch Reminders Sender for Ageing Table:
 * Sends WhatsApp payment reminders to all selected parties.
 */
export async function sendBatchRemindersAction(partyIds: string[]) {
  const parties = await getParties();
  const targets = parties.filter((p) => partyIds.includes(p.id) && p.mobile && p.balance > 0);

  const results: { id: string; name: string; mobile: string; ok: boolean; waLink: string }[] = [];

  for (const p of targets) {
    try {
      const res = await sendReminderWhatsApp({
        partyId: p.id,
        partyName: p.name,
        partyMobile: p.mobile!,
        balance: p.balance,
      });
      results.push({ id: p.id, name: p.name, mobile: p.mobile!, ok: res.ok, waLink: res.waLink });
    } catch {
      results.push({ id: p.id, name: p.name, mobile: p.mobile!, ok: false, waLink: "" });
    }
  }

  revalidatePath("/money/ageing");
  revalidatePath("/settings/whatsapp");
  return { ok: true, sentCount: results.filter((r) => r.ok).length, results };
}
