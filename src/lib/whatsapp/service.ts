import "server-only";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getFirm, getParties, getReceipts, getSales, getToday } from "@/lib/data";
import { mobileOf } from "@/lib/mobile";
import {
  buildDailySummaryMessage,
  buildInvoiceMessage,
  buildReceiptMessage,
  buildReminderMessage,
} from "./templates";
import type {
  SendDailySummaryParams,
  SendInvoiceParams,
  SendReceiptParams,
  SendReminderParams,
  WhatsAppConfig,
  WhatsAppMessage,
} from "./types";

const folder = join(process.cwd(), "local-data");
const CONFIG_FILE = "whatsapp-config.json";
const MESSAGES_FILE = "whatsapp-messages.json";

const defaultConfig: WhatsAppConfig = {
  enabled: true,
  provider: "click_to_chat",
  phoneNumberId: "",
  businessAccountId: "",
  accessToken: "",
  verifyToken: "ska_secret_webhook_verify_token_2026",
  webhookUrl: "https://your-domain.com/api/whatsapp/webhook",
  botAutoReply: true,
  sendReceiptsAutomatically: true,
  sendDailySummaryToOwner: true,
  ownerMobile: "9441117278",
  bankName: "Axis Bank, Srikakulam Branch",
  accountNo: "924020054321001",
  ifsc: "UTIB0000456",
  upiId: "kameshpotnuru@okaxis",
};

export async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  try {
    const raw = readFileSync(join(folder, CONFIG_FILE), "utf8");
    return { ...defaultConfig, ...JSON.parse(raw) };
  } catch {
    return defaultConfig;
  }
}

export async function saveWhatsAppConfig(patch: Partial<WhatsAppConfig>): Promise<WhatsAppConfig> {
  const current = await getWhatsAppConfig();
  const updated: WhatsAppConfig = { ...current, ...patch };
  try {
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, CONFIG_FILE), JSON.stringify(updated, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to write whatsapp-config.json", err);
  }
  return updated;
}

export async function getWhatsAppMessages(): Promise<WhatsAppMessage[]> {
  try {
    const raw = readFileSync(join(folder, MESSAGES_FILE), "utf8");
    const list: WhatsAppMessage[] = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function recordMessage(msg: WhatsAppMessage) {
  try {
    mkdirSync(folder, { recursive: true });
    const existing = await getWhatsAppMessages();
    const updated = [msg, ...existing.filter((m) => m.id !== msg.id)].slice(0, 500);
    writeFileSync(join(folder, MESSAGES_FILE), JSON.stringify(updated, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to write whatsapp-messages.json", err);
  }
}

/**
 * Sends a message via Meta WhatsApp Cloud API if configured, or falls back to
 * generating a direct 1-click wa.me link for browser opening.
 */
export async function sendWhatsAppMessage({
  recipientMobile,
  recipientName,
  partyId,
  kind,
  body,
}: {
  recipientMobile: string;
  recipientName: string;
  partyId?: string;
  kind: WhatsAppMessage["kind"];
  body: string;
}): Promise<{ ok: boolean; messageId: string; waLink: string; error?: string }> {
  const clean = mobileOf(recipientMobile);
  const waLink = `https://wa.me/91${clean}?text=${encodeURIComponent(body)}`;
  const messageId = `wa-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const config = await getWhatsAppConfig();

  let status: WhatsAppMessage["status"] = "sent";
  let metaMessageId: string | undefined;
  let errorMessage: string | undefined;

  // If Meta Cloud API is configured
  if (config.provider === "meta_cloud" && config.phoneNumberId && config.accessToken) {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v19.0/${config.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: `91${clean}`,
            type: "text",
            text: { preview_url: true, body },
          }),
        },
      );

      const json = await response.json();
      if (response.ok && json.messages?.[0]?.id) {
        metaMessageId = json.messages[0].id;
        status = "delivered";
      } else {
        errorMessage = json.error?.message || "Meta API Error";
        status = "failed";
      }
    } catch (e: any) {
      errorMessage = e?.message || "Network Error sending via Meta API";
      status = "failed";
    }
  }

  const logEntry: WhatsAppMessage = {
    id: messageId,
    recipientMobile: clean,
    recipientName,
    partyId,
    kind,
    direction: "outbound",
    body,
    status,
    sentAt: new Date().toISOString(),
    metaMessageId,
    errorMessage,
    waLink,
  };

  await recordMessage(logEntry);

  return {
    ok: status !== "failed",
    messageId,
    waLink,
    error: errorMessage,
  };
}

/**
 * 1. Sends Payment Receipt on WhatsApp
 */
export async function sendReceiptWhatsApp(params: SendReceiptParams) {
  const firm = await getFirm();
  const body = buildReceiptMessage(params, firm);

  return sendWhatsAppMessage({
    recipientMobile: params.partyMobile,
    recipientName: params.partyName,
    partyId: params.partyId,
    kind: "receipt",
    body,
  });
}

/**
 * 2. Sends Payment Due Reminder on WhatsApp
 */
export async function sendReminderWhatsApp(params: SendReminderParams) {
  const [firm, config] = await Promise.all([getFirm(), getWhatsAppConfig()]);
  const body = buildReminderMessage(
    params,
    firm,
    {
      bankName: config.bankName,
      accountNo: config.accountNo,
      ifsc: config.ifsc,
      upiId: config.upiId,
    },
  );

  return sendWhatsAppMessage({
    recipientMobile: params.partyMobile,
    recipientName: params.partyName,
    partyId: params.partyId,
    kind: "reminder",
    body,
  });
}

/**
 * 3. Sends Sales Bill / Delivery Notification on WhatsApp
 */
export async function sendInvoiceWhatsApp(params: SendInvoiceParams) {
  const firm = await getFirm();
  const body = buildInvoiceMessage(params, firm);

  return sendWhatsAppMessage({
    recipientMobile: params.partyMobile,
    recipientName: params.partyName,
    partyId: params.partyId,
    kind: "invoice",
    body,
  });
}

/**
 * 4. Sends Daily Business Briefing to Owner
 */
export async function sendDailySummaryWhatsApp(overrideParams?: Partial<SendDailySummaryParams>) {
  const [firm, config, today, sales, receipts, parties] = await Promise.all([
    getFirm(),
    getWhatsAppConfig(),
    getToday(),
    getSales(),
    getReceipts(),
    getParties(),
  ]);

  const totalSales = sales.filter((s) => s.billDate === today).reduce((sum, s) => sum + s.total, 0);
  const totalReceipts = receipts.filter((r) => r.date === today).reduce((sum, r) => sum + r.amount, 0);
  const overdueTotal = parties.reduce((sum, p) => sum + Math.max(0, p.balance), 0);

  const fullParams: SendDailySummaryParams = {
    date: today,
    totalSales,
    totalReceipts,
    lorryCount: 1,
    overdueTotal,
    recipientMobile: config.ownerMobile || "9441117278",
    ...overrideParams,
  };

  const body = buildDailySummaryMessage(fullParams, firm);

  return sendWhatsAppMessage({
    recipientMobile: fullParams.recipientMobile!,
    recipientName: "Kamesh Potnuru (Proprietor)",
    kind: "summary",
    body,
  });
}

/**
 * Handles Webhook Inbound Payload from Meta WhatsApp API.
 */
export async function handleMetaWebhook(payload: any) {
  const config = await getWhatsAppConfig();
  if (!config.botAutoReply) return { status: "ignored_bot_disabled" };

  try {
    const entry = payload?.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const message = change?.messages?.[0];

    if (!message || message.type !== "text") return { status: "ignored_non_text" };

    const from = message.from;
    const body = message.text?.body;
    if (!from || !body) return { status: "missing_content" };

    // Record incoming message
    const incomingLog: WhatsAppMessage = {
      id: `in-${Date.now()}-${message.id}`,
      recipientMobile: mobileOf(from),
      recipientName: change?.contacts?.[0]?.profile?.name || "Customer",
      kind: "bot_reply",
      direction: "inbound",
      body,
      status: "delivered",
      sentAt: new Date().toISOString(),
      metaMessageId: message.id,
    };
    await recordMessage(incomingLog);

    // Process with the Bot Engine
    const { processInboundWhatsAppMessage } = await import("./bot");
    const botResponse = await processInboundWhatsAppMessage(from, body, config);

    // Send auto-reply back
    await sendWhatsAppMessage({
      recipientMobile: from,
      recipientName: botResponse.recipientName,
      kind: "bot_reply",
      body: botResponse.replyText,
    });

    return { status: "replied", recipient: from };
  } catch (err: any) {
    console.error("Meta Webhook processing error:", err);
    return { status: "error", error: err?.message };
  }
}
