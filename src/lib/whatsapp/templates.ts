import { formatINR, formatShortDate } from "@/lib/format";
import type {
  SendDailySummaryParams,
  SendInvoiceParams,
  SendReceiptParams,
  SendReminderParams,
  WhatsAppConfig,
} from "./types";

/**
 * Builds payment receipt WhatsApp message (Bilingual Telugu & English).
 */
export function buildReceiptMessage(
  params: SendReceiptParams,
  firm: { name: string; phone: string; address?: string },
): string {
  const modeLabel: Record<string, string> = {
    cash: "నగదు (Cash)",
    upi: "UPI / PhonePe / GPay",
    neft: "బ్యాంక్ బదిలీ (Bank Transfer / NEFT)",
    rtgs: "RTGS",
    cheque: "చెక్ (Cheque)",
  };

  const modeText = modeLabel[params.mode.toLowerCase()] ?? params.mode;
  const balanceText =
    params.balanceAfter > 0
      ? `₹${formatINR(params.balanceAfter)} (Pending)`
      : params.balanceAfter === 0
        ? "₹0 (ఖాతా క్లియర్ / Nil)"
        : `₹${formatINR(Math.abs(params.balanceAfter))} (Advance Cr)`;

  return `🧾 *PAYMENT RECEIPT / చెల్లింపు రసీదు*
━━━━━━━━━━━━━━━━━━━
*${firm.name}*
Polaki, Srikakulam Dist. (A.P.)

నమస్కారం *${params.partyName}* గారు,
మీ నుండి చెల్లింపు అందినది. ధన్యవాదాలు! 🙏

• *Receipt No:* #${params.receiptNo}
• *Date:* ${params.date}
• *Amount Received:* *₹${formatINR(params.amount)}*
• *Payment Mode:* ${modeText}${params.remarks ? `\n• *Remarks:* ${params.remarks}` : ""}
• *Remaining Balance:* *${balanceText}*

ఏవైనా సందేహాలుంటే మమ్మల్ని సంప్రదించండి:
📞 *${firm.phone}* / 99636 84551
━━━━━━━━━━━━━━━━━━━
_Generated automatically by SKA Business Suite_`;
}

/**
 * Builds payment reminder WhatsApp message with bank details & UPI ID.
 */
export function buildReminderMessage(
  params: SendReminderParams,
  firm: { name: string; phone: string },
  bank: { bankName: string; accountNo: string; ifsc: string; upiId: string },
): string {
  const daysText =
    params.overdueDays && params.overdueDays > 0
      ? `\n• *Overdue Period:* ${params.overdueDays} days`
      : "";

  return `🔔 *PAYMENT REMINDER / చెల్లింపు రిమైండర్*
━━━━━━━━━━━━━━━━━━━
*${firm.name}*
Polaki, Srikakulam Dist. (A.P.)

నమస్కారం *${params.partyName}* గారు,
మీ ఖాతా బకాయి వివరాలు క్రింది విధంగా ఉన్నాయి:

• *Total Outstanding:* *₹${formatINR(params.balance)}*${daysText}

దయచేసి క్రింది మా బ్యాంక్ ఖాతా లేదా UPI ద్వారా చెల్లించగలరు:
🏦 *Bank:* ${bank.bankName}
🔢 *A/C No:* \`${bank.accountNo}\`
🏛️ *IFSC:* \`${bank.ifsc}\`
📱 *UPI ID:* \`${bank.upiId}\`

_చెల్లించిన తర్వాత దయచేసి రసీదు లేదా స్క్రీన్‌షాట్ పంపగలరు._

సంప్రదించండి:
📞 *${firm.phone}* / 99636 84551
━━━━━━━━━━━━━━━━━━━
_Sri Kameswari Agencies · Polaki_`;
}

/**
 * Builds sales invoice & dispatch dispatch message.
 */
export function buildInvoiceMessage(
  params: SendInvoiceParams,
  firm: { name: string; phone: string },
): string {
  const itemsText = params.items
    .map((item) => `  ▫️ ${item.name}: *${item.qty} ${item.unit}*`)
    .join("\n");

  const balanceText =
    params.balanceAfter !== undefined
      ? `\n• *Updated Ledger Balance:* ₹${formatINR(params.balanceAfter)}`
      : "";

  return `📦 *SALE & DISPATCH / సరుకు డెలివరీ*
━━━━━━━━━━━━━━━━━━━
*${firm.name}*
Polaki, Srikakulam Dist.

నమస్కారం *${params.partyName}* గారు,
మీ బిల్లు & సరుకు వివరాలు:

• *Bill No:* #${params.billNo}
• *Date:* ${params.date}
• *Items Loaded:*
${itemsText}
• *Total Bill Amount:* *₹${formatINR(params.total)}*${params.vehicleNo ? `\n• *Vehicle / Lorry:* ${params.vehicleNo}` : ""}${balanceText}

సరుకు అందిన వెంటనే పరిశీలించగలరు.
📞 సంప్రదించండి: *${firm.phone}*
━━━━━━━━━━━━━━━━━━━`;
}

/**
 * Builds daily summary briefing for the proprietor (Kamesh Potnuru).
 */
export function buildDailySummaryMessage(
  params: SendDailySummaryParams,
  firm: { name: string },
): string {
  return `📊 *DAILY BUSINESS SUMMARY · ${firm.name}*
━━━━━━━━━━━━━━━━━━━
📅 *Date:* ${params.date}

💰 *Today's Sales:* ₹${formatINR(params.totalSales)}
💵 *Collections / Receipts:* ₹${formatINR(params.totalReceipts)}
🚚 *Lorry Dispatches:* ${params.lorryCount} loads
⚠️ *Total Market Outstanding:* ₹${formatINR(params.overdueTotal)}

_Live report generated from SKA Management Suite._
━━━━━━━━━━━━━━━━━━━`;
}

/**
 * Builds interactive bot welcome menu for customers and staff.
 */
export function buildBotWelcomeMenu(
  userName: string,
  firm: { name: string; phone: string },
  isStaff: boolean,
): string {
  if (isStaff) {
    return `👋 *నమస్కారం ${userName} గారు! (Staff Portal)*
Welcome to *${firm.name}* Automated Assistant.

Staff Commands (Type any keyword):
• *today* - Today's sales, collections & lorry count
• *stock* - Live stock balances across Polaki & Srikakulam godowns
• *due* - High outstanding parties list
• *contact* - Firm & proprietor emergency numbers

Type *menu* at any time to return here.`;
  }

  return `🙏 *నమస్కారం ${userName} గారు!*
Welcome to *${firm.name}* (Polaki).
సిమెంట్ & ఐరన్ వ్యాపారంలో మీ నమ్మకమైన భాగస్వామి.

దయచేసి క్రింది ఆప్షన్లలో ఒకదాన్ని ఎంచుకోండి (నంబర్ లేదా పదం టైప్ చేయండి):

1️⃣ *Balance* - మీ ఖాతా బాకీ వివరాలు
2️⃣ *Receipt* - చివరి పేమెంట్ రసీదు వివరాలు
3️⃣ *Bank* - పేమెంట్ బ్యాంక్ ఖాతా & UPI వివరాలు
4️⃣ *Rates* - నేటి సిమెంట్ & స్టీల్ రేట్లు
5️⃣ *Contact* - ఆఫీస్ / ప్రొప్రైటర్ సంప్రదింపు నంబర్లు

_Type 1, 2, 3, 4, or 5 to continue._`;
}
