/**
 * Notifications are worked out from the same data as the screens: anything that needs someone's attention today.
 * Each one says which roles see it, and field staff and drivers only see their own. With the database connected,
 * a scheduled function writes these to a table and sends the phone push; the bell and list stay the same.
 */
import "server-only";
import {
  getAgeingReport,
  getCashSummary,
  getDashboard,
  getDeliveries,
  getGodowns,
  getOrders,
  getParties,
  getPolicies,
  getProducts,
  getProfiles,
  getPurchases,
  getSales,
  getStockBalances,
  getSuspenseLoads,
  getToday,
  getTransfers,
  getVehicles,
} from "@/lib/data";
import { formatDate, formatINR, formatNumber, formatShortDate } from "@/lib/format";
import { CASH_LIMIT, isLowStock } from "@/lib/limits";
import type { Notice } from "@/lib/notices";



const when = (days: number) => (days < 0 ? `${-days} ${days === -1 ? "day" : "days"} overdue` : days === 0 ? "due today" : days === 1 ? "due tomorrow" : `due in ${days} days`);

export async function getNotifications(): Promise<Notice[]> {
  const today = await getToday();
  const [dashboard, sales, parties, ageing, vehicles, balances, products, godowns, orders, transfers, cash, deliveries, suspense, purchases, policies, profiles] =
    await Promise.all([
      getDashboard(),
      getSales(),
      getParties(),
      getAgeingReport(),
      getVehicles(),
      getStockBalances(),
      getProducts(),
      getGodowns(),
      getOrders(),
      getTransfers(),
      getCashSummary(),
      getDeliveries(),
      getSuspenseLoads(),
      getPurchases(),
      getPolicies(),
      getProfiles(),
    ]);
  const notices: Notice[] = [];

  // Bills waiting for the owner, and a note to whoever made them.
  for (const a of dashboard.approvals) {
    // A godown's in-charge only gets their own godowns' bills, so a bill may not be among them.
    const sale = sales.find((s) => s.id === a.id);
    if (!sale) continue;
    notices.push({ id: `approval-${a.id}`, kind: "approval", title: `Confirm ${a.title}`, body: a.detail, href: a.href, date: sale.billDate, tone: "warning", roles: ["owner"] });
    if (profiles.find((p) => p.id === sale.createdBy)?.role !== "owner") {
      notices.push({
        id: `approval-wait-${a.id}`,
        kind: "approval",
        title: `Bill ${sale.billNo} is waiting for the owner`,
        body: `${sale.partyName} · ${formatINR(sale.total)}. It posts once approved.`,
        href: a.href,
        date: sale.billDate,
        tone: "neutral",
        roles: ["office", "field"],
        forProfile: sale.createdBy,
      });
    }
  }

  // Payment reminders for the office, and who to collect from for each field staff member.
  const reminderDue = ageing.filter((r) => r.dueForReminder);
  if (reminderDue.length) {
    notices.push({
      id: `reminders-${today}`,
      kind: "dues",
      title: `${reminderDue.length} ${reminderDue.length === 1 ? "party is" : "parties are"} due for a payment reminder`,
      body: `${formatINR(reminderDue.reduce((s, r) => s + r.overdue, 0))} past 7 days. Send from Ageing & reminders.`,
      href: "/money/ageing",
      date: today,
      tone: "warning",
      roles: ["owner", "office"],
    });
  }
  for (const r of ageing.filter((x) => x.overdue > 0)) {
    const staff = parties.find((p) => p.id === r.id)?.assignedTo;
    if (!staff) continue;
    const old = r.ageing["31-60"] + r.ageing["61-90"] + r.ageing["90+"];
    notices.push({
      id: `collect-${r.id}-${today}`,
      kind: "dues",
      title: `Collect from ${r.name}`,
      body: `${formatINR(r.overdue)} overdue${old ? `, ${formatINR(old)} of it over 30 days` : ""} · ${r.place}`,
      href: `/parties/${r.id}`,
      date: today,
      tone: old ? "danger" : "warning",
      roles: ["field"],
      forProfile: staff,
    });
  }

  // Vehicle papers and service.
  for (const v of vehicles.filter((x) => x.category !== "rented")) {
    for (const r of v.renewals.filter((x) => x.daysLeft <= 15)) {
      notices.push({
        id: `renewal-${v.id}-${r.doc}-${r.due}`,
        kind: "renewal",
        title: `${r.label} ${when(r.daysLeft)}`,
        body: `${v.label} · ${r.daysLeft < 0 ? `expired ${formatDate(r.due)}, renew before it goes out again` : `renew before ${formatDate(r.due)}`}`,
        href: `/fleet/${v.id}`,
        date: today,
        tone: r.daysLeft <= 3 ? "danger" : "warning",
        roles: v.driverId ? ["owner", "office", "driver"] : ["owner", "office"],
        forProfile: v.driverId,
      });
    }
    if (v.serviceDueInKm !== undefined && v.serviceDueInKm <= 500) {
      notices.push({
        id: `service-${v.id}-${v.nextServiceKm}`,
        kind: "renewal",
        title: `Service ${v.serviceDueInKm <= 0 ? "overdue" : `due in ${formatNumber(v.serviceDueInKm)} km`}`,
        body: `${v.label} · next service at ${formatNumber(v.nextServiceKm ?? 0)} km, now ${formatNumber(v.odometer)} km`,
        href: `/fleet/${v.id}`,
        date: today,
        tone: v.serviceDueInKm <= 0 ? "danger" : "warning",
        roles: v.driverId ? ["owner", "office", "driver"] : ["owner", "office"],
        forProfile: v.driverId,
      });
    }
  }

  // Low stock, one notice per godown.
  for (const g of godowns) {
    const low = balances
      .filter((b) => b.godownId === g.id)
      .map((b) => ({ ...b, product: products.find((p) => p.id === b.productId)! }))
      .filter((b) => isLowStock(b.qty, b.product.unit));
    if (!low.length) continue;
    notices.push({
      id: `stock-${g.id}-${today}`,
      kind: "stock",
      title: `Low stock at ${g.name}`,
      body: low.map((b) => `${b.product.name} ${formatNumber(b.qty)} ${b.product.unit === "bag" ? "bags" : "kg"}`).join(" · "),
      href: "/stock",
      date: today,
      tone: "warning",
      roles: ["owner", "office", "godown"],
    });
  }

  // Orders: new ones for the office to confirm, confirmed ones for the godown to load.
  for (const o of orders) {
    if (o.status === "new") {
      notices.push({ id: `order-new-${o.id}`, kind: "order", title: `New order from ${o.partyName}`, body: `Order ${o.orderNo}, taken by ${o.takenByName}. Confirm the rate and date.`, href: `/orders/${o.id}`, date: o.date, tone: "accent", roles: ["owner", "office"] });
    } else if (o.status === "confirmed" || o.status === "partly_dispatched") {
      notices.push({
        id: `order-load-${o.id}-${o.status}`,
        kind: "order",
        title: `${o.status === "confirmed" ? "Load" : "Finish loading"} order ${o.orderNo}`,
        body: `${o.partyName}${o.deliverBy ? ` · deliver by ${formatShortDate(o.deliverBy)}` : ""}${o.destination ? ` · ${o.destination}` : ""}`,
        href: `/orders/${o.id}`,
        date: o.date,
        tone: "neutral",
        roles: ["godown"],
      });
    }
  }

  // Godown: company lorries that came in today (their stock is already in) and transfers on the way.
  for (const p of purchases.filter((x) => x.receivedDate === today && !x.onLorry)) {
    notices.push({ id: `arriving-${p.id}`, kind: "stock", title: `Lorry from ${p.companyName} today`, body: `Invoice ${p.invoiceNo} · ${p.lorryNo ?? "lorry"} · check the count matches the bill`, href: `/purchases/${p.id}`, date: today, tone: "accent", roles: ["godown"] });
  }
  for (const t of transfers.filter((x) => x.status === "in_transit")) {
    notices.push({ id: `transfer-${t.id}`, kind: "stock", title: `Transfer ${t.transferNo} on the way to ${t.toName}`, body: `From ${t.fromName} on ${t.vehicle}. Mark it received when it arrives.`, href: "/stock/transfers", date: t.date, tone: "neutral", roles: ["office", "godown"] });
  }
  const waiting = suspense.filter((s) => !s.assigned);
  if (waiting.length) {
    notices.push({
      id: `suspense-${waiting.map((s) => s.id).join("-")}`,
      kind: "stock",
      title: `${waiting.length} suspense ${waiting.length === 1 ? "load needs" : "loads need"} a buyer`,
      body: waiting.map((s) => `${formatNumber(s.qty)} ${s.product.unit === "bag" ? "bags" : "kg"} ${s.product.name} on ${s.vehicle}`).join(" · "),
      href: "/stock/suspense",
      date: waiting[0].date,
      tone: "warning",
      roles: ["owner", "office"],
    });
  }

  // Cash staff are carrying.
  for (const c of cash.filter((x) => x.role === "field" && x.closing > CASH_LIMIT)) {
    notices.push({ id: `cash-${c.holder}-${today}`, kind: "cash", title: `${c.name} is holding ${formatINR(c.closing)}`, body: `Above the ${formatINR(CASH_LIMIT)} limit. Ask for a handover today.`, href: `/money/cash/${c.holder}`, date: today, tone: "warning", roles: ["owner"] });
    notices.push({ id: `cash-own-${c.holder}-${today}`, kind: "cash", title: `Hand over cash today`, body: `You are holding ${formatINR(c.closing)}, above the ${formatINR(CASH_LIMIT)} limit.`, href: `/money/cash/${c.holder}`, date: today, tone: "warning", roles: ["field"], forProfile: c.holder });
  }

  // Driver: today's deliveries.
  const todays = deliveries.filter((d) => d.date === today && d.status !== "delivered");
  for (const driver of new Set(todays.map((d) => d.driverId))) {
    const mine = todays.filter((d) => d.driverId === driver);
    notices.push({ id: `deliveries-${driver}-${today}`, kind: "delivery", title: `${mine.length} ${mine.length === 1 ? "delivery" : "deliveries"} today`, body: mine.map((d) => `${d.partyName}${d.destination ? `, ${d.destination}` : ""}`).join(" · "), href: "/", date: today, tone: "accent", roles: ["driver"], forProfile: driver });
  }

  // Owner's personal dues (titles only; details stay behind the PIN).
  // Vehicle insurance is already covered above under the vehicle's papers.
  const vehiclePolicies = new Set(policies.filter((p) => p.kind === "vehicle").map((p) => p.id));
  for (const u of dashboard.upcoming.filter((x) => !vehiclePolicies.has(x.id))) {
    notices.push({ id: `personal-${u.id}-${today}`, kind: "personal", title: `${u.title} ${u.when === "overdue" ? "is overdue" : `due ${u.when}`}`, body: "Personal · open with your PIN", href: u.href, date: today, tone: u.when === "overdue" ? "danger" : "neutral", roles: ["owner"] });
  }

  const rank = { danger: 0, warning: 1, accent: 2, neutral: 3 };
  return notices.sort((a, b) => b.date.localeCompare(a.date) || rank[a.tone] - rank[b.tone]);
}
