import { NextRequest, NextResponse } from "next/server";
import {
  sendDailySummaryWhatsApp,
  sendInvoiceWhatsApp,
  sendReceiptWhatsApp,
  sendReminderWhatsApp,
  sendWhatsAppMessage,
} from "@/lib/whatsapp/service";

/**
 * POST /api/whatsapp/send:
 * Server endpoint to trigger sending WhatsApp receipts, reminders, invoices, or test messages.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, params } = body;

    if (action === "receipt") {
      const res = await sendReceiptWhatsApp(params);
      return NextResponse.json(res);
    }

    if (action === "reminder") {
      const res = await sendReminderWhatsApp(params);
      return NextResponse.json(res);
    }

    if (action === "invoice") {
      const res = await sendInvoiceWhatsApp(params);
      return NextResponse.json(res);
    }

    if (action === "summary") {
      const res = await sendDailySummaryWhatsApp(params);
      return NextResponse.json(res);
    }

    if (action === "custom" || action === "test") {
      const res = await sendWhatsAppMessage({
        recipientMobile: params.mobile,
        recipientName: params.name || "Test Recipient",
        kind: params.kind || "custom",
        body: params.body,
      });
      return NextResponse.json(res);
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    console.error("Error in /api/whatsapp/send:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
