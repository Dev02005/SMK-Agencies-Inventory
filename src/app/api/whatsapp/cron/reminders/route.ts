import { NextRequest, NextResponse } from "next/server";
import { getParties } from "@/lib/data";
import { sendReminderWhatsApp } from "@/lib/whatsapp/service";

/**
 * POST /api/whatsapp/cron/reminders:
 * Automated scheduled job to send payment reminders to parties who are due.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    // Simple cron security check
    const secret = process.env.CRON_SECRET || "ska-reminder-cron-2026";
    if (authHeader && authHeader !== `Bearer ${secret}` && process.env.NODE_ENV === "production") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const parties = await getParties();
    const dueParties = parties.filter((p) => p.balance > 0 && p.mobile);

    const results: { party: string; status: string; waLink?: string }[] = [];

    // Send reminders to top 15 overdue parties to prevent flooding
    for (const p of dueParties.slice(0, 15)) {
      try {
        const res = await sendReminderWhatsApp({
          partyId: p.id,
          partyName: p.name,
          partyMobile: p.mobile!,
          balance: p.balance,
        });
        results.push({ party: p.name, status: res.ok ? "sent" : "failed", waLink: res.waLink });
      } catch {
        results.push({ party: p.name, status: "error" });
      }
    }

    return NextResponse.json({
      ok: true,
      processed: results.length,
      results,
    });
  } catch (err: unknown) {
    console.error("Cron reminders error:", err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
