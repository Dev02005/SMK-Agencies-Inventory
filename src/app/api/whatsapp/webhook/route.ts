import { NextRequest, NextResponse } from "next/server";
import { getWhatsAppConfig, handleMetaWebhook } from "@/lib/whatsapp/service";

/**
 * GET /api/whatsapp/webhook:
 * Webhook Verification endpoint used by Meta WhatsApp Cloud API.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const config = await getWhatsAppConfig();

  if (mode === "subscribe" && token === (config.verifyToken || "ska_secret_webhook_verify_token_2026")) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden - Invalid verification token", { status: 403 });
}

/**
 * POST /api/whatsapp/webhook:
 * Inbound webhook for receiving incoming WhatsApp messages & delivery receipts from Meta.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const result = await handleMetaWebhook(payload);
    return NextResponse.json({ ok: true, result });
  } catch (err: unknown) {
    console.error("Webhook processing error:", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
