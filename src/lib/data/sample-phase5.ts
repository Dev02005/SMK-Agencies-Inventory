/**
 * Sample data for phase 5: payment reminder messages and the rules for when they go.
 * The Telugu text is a starting draft for the owner to check before it is used.
 */
import type { ReminderRules, ReminderTemplate } from "./types";

export const reminderRules: ReminderRules = {
  firstAfterDays: 7,
  repeatEveryDays: 7,
  stopAfter: 4,
  sendAt: "10:00",
  skipSundays: true,
  smsIfWhatsappFails: true,
  minimumAmount: 1000,
};

export const reminderTemplates: ReminderTemplate[] = [
  {
    id: "rt-first",
    name: "First reminder",
    stage: "first",
    channel: "whatsapp",
    language: "en",
    body: "Namaste {party}, this is {firm}. ₹{amount} is due on bill {bill_no} dated {bill_date}. Kindly arrange the payment at the earliest. For any query call {phone}. Thank you.",
    active: true,
  },
  {
    id: "rt-first-te",
    name: "First reminder (Telugu)",
    stage: "first",
    channel: "whatsapp",
    language: "te",
    body: "నమస్కారం {party}, {firm} నుండి. బిల్లు {bill_no} ({bill_date}) పై ₹{amount} బకాయి ఉంది. దయచేసి త్వరగా చెల్లించండి. వివరాలకు {phone} కి కాల్ చేయండి. ధన్యవాదాలు.",
    active: false,
  },
  {
    id: "rt-repeat",
    name: "Weekly reminder",
    stage: "repeat",
    channel: "whatsapp",
    language: "en",
    body: "Namaste {party}, a gentle reminder from {firm}: ₹{amount} has been pending for {days} days. Your total balance with us is ₹{balance}. {staff} will call on you this week. Thank you.",
    active: true,
  },
  {
    id: "rt-final",
    name: "Final reminder",
    stage: "final",
    channel: "sms",
    language: "en",
    body: "{firm}: Rs.{amount} pending for {days} days on bill {bill_no}. Please clear it this week to keep your credit open. Call {phone}.",
    active: true,
  },
  {
    id: "rt-thanks",
    name: "Payment received",
    stage: "thanks",
    channel: "whatsapp",
    language: "en",
    body: "Thank you {party}. We have received ₹{amount}. Your balance with {firm} is now ₹{balance}.",
    active: true,
  },
];
