import {
  getBankAccounts,
  getDashboard,
  getFirm,
  getParties,
  getProducts,
  getReceipts,
  getSales,
  getSignInPeople,
  getStockBalances,
  getToday,
} from "@/lib/data";
import { formatINR } from "@/lib/format";
import { mobileOf } from "@/lib/mobile";
import { buildBotWelcomeMenu } from "./templates";
import type { WhatsAppConfig } from "./types";

export type BotResponse = {
  replyText: string;
  recipientMobile: string;
  recipientName: string;
};

/**
 * Intelligent Inbound WhatsApp Bot Message Processor.
 * Works with Meta WhatsApp Webhooks or direct chat simulator.
 */
export async function processInboundWhatsAppMessage(
  fromRaw: string,
  messageBody: string,
  config: WhatsAppConfig,
): Promise<BotResponse> {
  const cleanPhone = mobileOf(fromRaw);
  const text = messageBody.trim().toLowerCase();

  const [parties, people, firm, today] = await Promise.all([
    getParties(),
    getSignInPeople(),
    getFirm(),
    getToday(),
  ]);

  // Check if sender is registered staff/owner
  const staff = people.find((p) => mobileOf(p.mobile) === cleanPhone);
  const isStaff = Boolean(staff);

  // Check if sender is registered party/customer
  const party = parties.find((p) => p.mobile && mobileOf(p.mobile) === cleanPhone);

  const senderName = staff?.fullName || party?.name || "Customer";

  // 1. Staff Commands
  if (isStaff) {
    if (text.includes("today") || text.includes("summary") || text.includes("sales")) {
      const [sales, receipts] = await Promise.all([getSales(), getReceipts()]);
      const todaySales = sales
        .filter((s) => s.billDate === today)
        .reduce((sum, s) => sum + s.total, 0);
      const todayReceipts = receipts
        .filter((r) => r.date === today)
        .reduce((sum, r) => sum + r.amount, 0);

      return {
        recipientMobile: cleanPhone,
        recipientName: senderName,
        replyText: `📊 *Today's Live Report (${today})*
━━━━━━━━━━━━━━━━━━━
💰 *Sales Total:* ₹${formatINR(todaySales)}
💵 *Collections:* ₹${formatINR(todayReceipts)}
👤 *Requested by:* ${senderName} (${staff?.designation || staff?.role})

_Sri Kameswari Agencies · Polaki_`,
      };
    }

    if (text.includes("stock") || text.includes("godown")) {
      const [balances, products] = await Promise.all([getStockBalances(), getProducts()]);
      const productMap = new Map(products.map((p) => [p.id, p]));

      const stockLines = balances.slice(0, 5).map((b) => {
        const p = productMap.get(b.productId);
        return `• *${p?.name ?? b.productId}:* ${b.qty} ${p?.unit ?? "bags"}`;
      });

      return {
        recipientMobile: cleanPhone,
        recipientName: senderName,
        replyText: `📦 *Live Godown Stock Highlights:*
━━━━━━━━━━━━━━━━━━━
${stockLines.join("\n")}

_Detailed godown report available on dashboard._`,
      };
    }

    if (text.includes("due") || text.includes("outstanding")) {
      const topDebtors = [...parties]
        .filter((p) => p.balance > 0)
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 5);

      const debtorLines = topDebtors.map(
        (p, i) => `${i + 1}. *${p.name}* (${p.place || "Polaki"}): ₹${formatINR(p.balance)}`,
      );

      return {
        recipientMobile: cleanPhone,
        recipientName: senderName,
        replyText: `⚠️ *Top Outstanding Accounts:*
━━━━━━━━━━━━━━━━━━━
${debtorLines.join("\n")}

_Send reminders from Money › Ageing & Reminders screen._`,
      };
    }
  }

  // 2. Customer / General Commands
  // Greeting / Menu
  if (
    text === "hi" ||
    text === "hello" ||
    text === "start" ||
    text === "menu" ||
    text === "help" ||
    text.includes("నమస్కారం") ||
    text.includes("హలో")
  ) {
    return {
      recipientMobile: cleanPhone,
      recipientName: senderName,
      replyText: buildBotWelcomeMenu(senderName, firm, isStaff),
    };
  }

  // Option 1: Outstanding Balance
  if (text === "1" || text.includes("balance") || text.includes("due") || text.includes("బాకీ")) {
    if (party) {
      const balanceStatus =
        party.balance > 0
          ? `మీ ఖాతా బకాయి మొత్తం: *₹${formatINR(party.balance)}* (Pending Payment)`
          : party.balance === 0
            ? "మీ ఖాతాలో ఎలాంటి బకాయి లేదు. (No Pending Due - Thank you!)"
            : `మీ ఖాతాలో అడ్వాన్స్ క్రెడిట్ ఉంది: *₹${formatINR(Math.abs(party.balance))}* (Advance)`;

      return {
        recipientMobile: cleanPhone,
        recipientName: senderName,
        replyText: `📋 *Account Ledger Summary / ఖాతా వివరాలు*
━━━━━━━━━━━━━━━━━━━
*${firm.name}*

నమస్కారం *${party.name}* గారు,
${balanceStatus}

• *Customer ID:* ${party.id}
• *Location:* ${party.place || "Polaki"}
${party.creditLimit ? `• *Credit Limit:* ₹${formatINR(party.creditLimit)}` : ""}

దయచేసి క్రింది UPI / బ్యాంక్ ఖాతాకు చెల్లించగలరు:
📱 *UPI ID:* \`${config.upiId || "kameshpotnuru@okaxis"}\`
🏦 *A/C:* \`${config.accountNo || "924020054321001"}\` (${config.ifsc || "UTIB0000456"})

ధన్యవాదాలు! 🙏`,
      };
    }

    return {
      recipientMobile: cleanPhone,
      recipientName: senderName,
      replyText: `నమస్కారం! మీ ఫోన్ నంబర్ (+91 ${cleanPhone}) మా కస్టమర్ డైరెక్టరీలో నమోదు కాలేదు.
దయచేసి మీ పేరు మరియు విలేజ్ పేరు పంపండి, లేదా ఆఫీస్ నంబర్ కి సంప్రదించండి:
📞 *${firm.phone}*`,
    };
  }

  // Option 2: Payment Receipt Details
  if (text === "2" || text.includes("receipt") || text.includes("రసీదు") || text.includes("payment")) {
    if (party) {
      const receipts = await getReceipts();
      const lastReceipt = receipts
        .filter((r) => r.partyId === party.id)
        .sort((a, b) => b.date.localeCompare(a.date))[0];

      if (lastReceipt) {
        return {
          recipientMobile: cleanPhone,
          recipientName: senderName,
          replyText: `🧾 *Last Payment Received / చివరి రసీదు*
━━━━━━━━━━━━━━━━━━━
నమస్కారం *${party.name}* గారు,
మీ చివరి పేమెంట్ వివరాలు:

• *Receipt No:* #${lastReceipt.receiptNo}
• *Date:* ${lastReceipt.date}
• *Amount:* *₹${formatINR(lastReceipt.amount)}*
• *Mode:* ${lastReceipt.mode.toUpperCase()}
• *Current Remaining Balance:* *₹${formatINR(party.balance)}*

ఏవైనా ప్రశ్నలుంటే ఆఫీస్‌ను సంప్రదించండి:
📞 *${firm.phone}*`,
        };
      }

      return {
        recipientMobile: cleanPhone,
        recipientName: senderName,
        replyText: `నమస్కారం *${party.name}* గారు! మీ ఖాతాలో ఇటీవల ఎలాంటి రసీదులు లేవు.
ప్రస్తుత బాకీ: *₹${formatINR(party.balance)}*.`,
      };
    }

    return {
      recipientMobile: cleanPhone,
      recipientName: senderName,
      replyText: `రసీదు వివరాల కోసం దయచేసి మా ఆఫీస్‌ను సంప్రదించండి:
📞 *${firm.phone}*`,
    };
  }

  // Option 3: Bank & UPI details
  if (text === "3" || text.includes("bank") || text.includes("upi") || text.includes("qr") || text.includes("ఖాతా")) {
    const bankDetails = {
      bankName: config.bankName || "Axis Bank, Srikakulam Branch",
      accountNo: config.accountNo || "924020054321001",
      ifsc: config.ifsc || "UTIB0000456",
      upiId: config.upiId || "kameshpotnuru@okaxis",
    };

    return {
      recipientMobile: cleanPhone,
      recipientName: senderName,
      replyText: `🏦 *Official Payment Bank Details / బ్యాంక్ ఖాతా*
━━━━━━━━━━━━━━━━━━━
*${firm.name}*
Polaki, Srikakulam Dist.

• *Account Name:* Sri Kameswari Agencies
• *Bank Name:* ${bankDetails.bankName}
• *Account No:* \`${bankDetails.accountNo}\`
• *IFSC Code:* \`${bankDetails.ifsc}\`
• *UPI ID / GPay / PhonePe:* \`${bankDetails.upiId}\`

_చెల్లించిన తర్వాత స్క్రీన్‌షాట్ లేదా రసీదు మెమో నంబర్ ఇక్కడ పంపగలరు._
📞 *${firm.phone}* / 99636 84551`,
    };
  }

  // Option 4: Cement & Steel Rates
  if (
    text === "4" ||
    text.includes("rate") ||
    text.includes("rates") ||
    text.includes("cement") ||
    text.includes("steel") ||
    text.includes("ధరలు")
  ) {
    const products = await getProducts();
    const cement = products.filter((p) => p.category === "cement");
    const steel = products.filter((p) => p.category === "steel");

    return {
      recipientMobile: cleanPhone,
      recipientName: senderName,
      replyText: `🏗️ *Official Dealer Rates / నేటి ధరల సమాచారం*
━━━━━━━━━━━━━━━━━━━
*${firm.name}*
Polaki & Srikakulam Depots

🔹 *CEMENT (సిమెంట్):*
• UltraTech Super / Weather Plus
• Deccan PPC / OPC 53 Grade
• Maha Cement
• Sagar Super PPC

🔹 *TMT STEEL & IRON (స్టీల్):*
• Vishaka TMT 550D (8mm, 10mm, 12mm, 16mm)
• MS Iron / Binding Wire

_హోల్‌సేల్ ఆర్డర్లు & లారీ సైట్ డెలివరీల కోసం సంప్రదించండి:_
📞 *${firm.phone}* / 99636 84551`,
    };
  }

  // Option 5: Contact
  if (text === "5" || text.includes("contact") || text.includes("owner") || text.includes("phone")) {
    return {
      recipientMobile: cleanPhone,
      recipientName: senderName,
      replyText: `📞 *Contact Us / మమ్మల్ని సంప్రదించండి*
━━━━━━━━━━━━━━━━━━━
*${firm.name}*
Polaki - 532 429, Srikakulam Dist. (A.P.)

• *Proprietor:* Kamesh Potnuru
  📱 *Mobile:* 94411 17278 / 99636 84551
• *Main Office / Godown:* Polaki
• *Branch Depot:* Srikakulam Town
• *Email:* contact@srikameswariagencies.com
• *GSTIN:* 37AAAAA0000A1Z5

_We are available Mon - Sat: 8:00 AM - 8:30 PM_`,
    };
  }

  // Default Fallback
  return {
    recipientMobile: cleanPhone,
    recipientName: senderName,
    replyText: `నమస్కారం! మీ సందేశం అందినది.
ఆప్షన్ల కొరకు *menu* లేదా *hi* అని టైప్ చేయండి.
లేదా నేరుగా సంప్రదించండి: 📞 *${firm.phone}*`,
  };
}
