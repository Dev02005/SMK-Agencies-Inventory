/**
 * Types and interfaces for the Sri Kameswari Agencies (SKA)
 * WhatsApp Bot, Reminders, Notifications, and Receipts engine.
 */

export type WhatsAppMessageKind =
  | "receipt"
  | "reminder"
  | "invoice"
  | "notification"
  | "bot_reply"
  | "summary"
  | "custom";

export type WhatsAppMessageStatus = "queued" | "sent" | "delivered" | "read" | "failed";

export type WhatsAppMessage = {
  id: string;
  recipientMobile: string; // 10-digit mobile
  recipientName: string;
  partyId?: string;
  kind: WhatsAppMessageKind;
  direction: "outbound" | "inbound";
  body: string;
  status: WhatsAppMessageStatus;
  sentAt: string; // ISO string
  metaMessageId?: string;
  errorMessage?: string;
  waLink?: string; // Direct wa.me link for browser 1-click fallback
};

export type WhatsAppConfig = {
  enabled: boolean;
  provider: "meta_cloud" | "click_to_chat";
  phoneNumberId?: string;
  businessAccountId?: string;
  accessToken?: string;
  verifyToken?: string;
  webhookUrl?: string;
  // Bot auto-responder settings
  botAutoReply: boolean;
  // Automated notifications
  sendReceiptsAutomatically: boolean;
  sendDailySummaryToOwner: boolean;
  ownerMobile: string;
  // Bank details included in reminders
  bankName: string;
  accountNo: string;
  ifsc: string;
  upiId: string;
};

export type SendReceiptParams = {
  receiptNo: number | string;
  partyId: string;
  partyName: string;
  partyMobile: string;
  amount: number;
  mode: string;
  date: string;
  balanceAfter: number;
  remarks?: string;
};

export type SendReminderParams = {
  partyId: string;
  partyName: string;
  partyMobile: string;
  balance: number;
  overdueDays?: number;
  overdueAmount?: number;
};

export type SendInvoiceParams = {
  billNo: string | number;
  partyId?: string;
  partyName: string;
  partyMobile: string;
  items: { name: string; qty: number; unit: string }[];
  total: number;
  vehicleNo?: string;
  date: string;
  balanceAfter?: number;
};

export type SendDailySummaryParams = {
  date: string;
  totalSales: number;
  totalReceipts: number;
  lorryCount: number;
  overdueTotal: number;
  recipientMobile?: string;
};
