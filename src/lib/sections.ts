import type { LucideIcon } from "lucide-react";
import {
  CalendarCheck,
  ChartColumn,
  CircleSlash,
  ClipboardList,
  FileText,
  Fuel,
  HandCoins,
  Handshake,
  Hourglass,
  House,
  IdCard,
  Landmark,
  LayoutGrid,
  Lock,
  Package,
  ReceiptText,
  Route,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import type { Role } from "@/lib/data/types";

/** Module icon colours from the design plan: blue sales, green money, amber stock, teal fleet, purple personal. */
export type Tone = "blue" | "green" | "amber" | "teal" | "purple" | "grey";

export type Section = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: Tone;
  /** Who sees this section in the navigation. */
  roles: Role[];
  action?: { label: string; href: string };
};

const everyone: Role[] = ["owner", "office", "godown", "field", "driver"];

export const home: Section = {
  href: "/",
  title: "Home",
  description: "Today's business at a glance",
  icon: House,
  tone: "blue",
  roles: everyone,
};

const sections: Section[] = [
  {
    href: "/sales",
    title: "Sales",
    description: "Cement and steel bills, lorry sales, discounts and transport",
    icon: ReceiptText,
    tone: "blue",
    roles: ["owner", "office", "field"],
    action: { label: "New sale", href: "/sales/new" },
  },
  {
    href: "/orders",
    title: "Orders",
    description: "Orders dashboard and pending orders",
    icon: ClipboardList,
    tone: "blue",
    action: { label: "New order", href: "/orders/new" },
    roles: ["owner", "office", "field", "godown"],
  },
  {
    href: "/quotations",
    title: "Quotations",
    description: "Quotations and estimates in the SKA format",
    icon: FileText,
    tone: "blue",
    roles: ["owner", "office", "field"],
    action: { label: "New quotation", href: "/quotations/new" },
  },
  {
    href: "/purchases",
    title: "Purchases",
    description: "Company lorries bought; their stock goes into the godown",
    icon: ShoppingCart,
    tone: "blue",
    roles: ["owner", "office", "godown"],
    action: { label: "New purchase", href: "/purchases/new" },
  },
  {
    href: "/money",
    title: "Receipts & payments",
    description: "Money received from parties and paid to companies",
    icon: Wallet,
    tone: "green",
    roles: ["owner", "office", "field"],
    action: { label: "New receipt", href: "/money/receipts/new" },
  },
  {
    href: "/money/cash",
    title: "Staff cash",
    description: "Daily cash book for each employee",
    icon: HandCoins,
    tone: "green",
    roles: ["owner", "office", "field", "driver"],
  },
  {
    href: "/money/expenses",
    title: "Expenses",
    description: "Rent, driver payments, salaries and more",
    icon: Fuel,
    tone: "green",
    roles: ["owner", "office", "driver"],
    action: { label: "New expense", href: "/money/expenses/new" },
  },
  {
    href: "/money/advances",
    title: "Advances",
    description: "Customer advances and fixed-price cement commitments",
    icon: Handshake,
    tone: "green",
    roles: ["owner", "office"],
  },
  {
    href: "/money/ageing",
    title: "Ageing & reminders",
    description: "Who owes what, for how long, and payment reminders",
    icon: Hourglass,
    tone: "green",
    roles: ["owner", "office"],
  },
  {
    href: "/money/banks",
    title: "Banks",
    description: "Bank balances and every entry in and out",
    icon: Landmark,
    tone: "green",
    roles: ["owner", "office"],
  },
  {
    href: "/money/bad-debts",
    title: "Bad debts",
    description: "Amounts written off, with the owner's approval",
    icon: CircleSlash,
    tone: "green",
    roles: ["owner"],
  },
  {
    href: "/parties",
    title: "Parties",
    description: "Customers, sub-dealers, companies and ledgers",
    icon: Users,
    tone: "blue",
    roles: ["owner", "office", "field"],
    action: { label: "New party", href: "/parties/new" },
  },
  {
    href: "/stock",
    title: "Stock",
    description: "Godown stock and movements",
    icon: Package,
    tone: "amber",
    roles: ["owner", "office", "godown"],
    action: { label: "New purchase", href: "/purchases/new" },
  },
  {
    href: "/people",
    title: "People",
    description: "Staff, attendance, tours, targets and salary",
    icon: IdCard,
    tone: "blue",
    roles: everyone,
  },
  {
    href: "/fleet",
    title: "Vehicles",
    description: "Vans, lorries, renewals, freight and GPS",
    icon: Truck,
    tone: "teal",
    roles: ["owner", "office", "godown", "driver"],
  },
  {
    href: "/reports",
    title: "Reports",
    description: "Daybook, ledgers, ageing and Excel exports",
    icon: ChartColumn,
    tone: "blue",
    roles: ["owner", "office"],
  },
  {
    href: "/personal",
    title: "Personal",
    description: "Chits, rents, insurance, banks and notes",
    icon: Lock,
    tone: "purple",
    roles: ["owner"],
  },
  {
    href: "/settings",
    title: "Settings",
    description: "Your account and password, install the app, firm, godowns, products and users",
    icon: Settings,
    tone: "grey",
    roles: everyone,
  },
];

const byHref = (href: string) => sections.find((s) => s.href === href)!;

/** Desktop sidebar groups. */
export const sidebarGroups: { label?: string; items: Section[] }[] = [
  { items: [home] },
  { label: "Sales", items: ["/sales", "/orders", "/quotations", "/purchases"].map(byHref) },
  { label: "Money", items: ["/money", "/money/cash", "/money/expenses", "/money/advances", "/money/ageing", "/money/banks", "/money/bad-debts"].map(byHref) },
  { label: "Records", items: ["/parties", "/stock", "/people", "/fleet"].map(byHref) },
  { label: "Insights", items: [byHref("/reports")] },
  { label: "Private", items: [byHref("/personal")] },
  { items: [byHref("/settings")] },
];

export type Tab = { href: string; title: string; icon: LucideIcon };

/** Four tabs per role on phones (the fifth is always More), from the design plan. */
export const roleTabs: Record<Role, Tab[]> = {
  owner: [
    { href: "/", title: "Home", icon: House },
    { href: "/sales", title: "Sales", icon: ReceiptText },
    { href: "/money", title: "Money", icon: Wallet },
    { href: "/parties", title: "Parties", icon: Users },
  ],
  office: [
    { href: "/", title: "Home", icon: House },
    { href: "/sales", title: "Sales", icon: ReceiptText },
    { href: "/money", title: "Money", icon: Wallet },
    { href: "/parties", title: "Parties", icon: Users },
  ],
  godown: [
    { href: "/", title: "Today", icon: House },
    { href: "/stock", title: "Stock", icon: Package },
    { href: "/purchases", title: "Purchases", icon: ShoppingCart },
    { href: "/orders", title: "Orders", icon: ClipboardList },
  ],
  field: [
    { href: "/", title: "Today", icon: House },
    { href: "/money", title: "Collections", icon: Wallet },
    { href: "/parties", title: "Parties", icon: Users },
    { href: "/orders", title: "Orders", icon: ClipboardList },
  ],
  driver: [
    { href: "/", title: "Today", icon: Route },
    { href: "/money/expenses/new", title: "Expense", icon: ReceiptText },
    { href: "/people", title: "Attendance", icon: CalendarCheck },
    { href: "/money/cash", title: "Cash", icon: HandCoins },
  ],
};

export const moreTab: Tab = { href: "/more", title: "More", icon: LayoutGrid };

export const quickAddItems: { label: string; href: string; icon: LucideIcon; tone: Tone; roles: Role[] }[] = [
  { label: "New sale", href: "/sales/new", icon: ReceiptText, tone: "blue", roles: ["owner", "office", "field"] },
  { label: "Receipt", href: "/money/receipts/new", icon: Wallet, tone: "green", roles: ["owner", "office", "field"] },
  { label: "Payment", href: "/money/payments/new", icon: HandCoins, tone: "green", roles: ["owner", "office"] },
  { label: "Hand over cash", href: "/money/cash/handover/new", icon: HandCoins, tone: "green", roles: ["owner", "office", "field", "driver"] },
  { label: "Quotation", href: "/quotations/new", icon: FileText, tone: "blue", roles: ["owner", "office", "field"] },
  { label: "Purchase", href: "/purchases/new", icon: ShoppingCart, tone: "blue", roles: ["owner", "office", "godown"] },
  { label: "Transfer", href: "/stock/transfers/new", icon: Package, tone: "amber", roles: ["owner", "office", "godown"] },
  { label: "New party", href: "/parties/new", icon: Users, tone: "blue", roles: ["owner", "office", "field"] },
  { label: "Expense", href: "/money/expenses/new", icon: Fuel, tone: "green", roles: ["owner", "office", "driver"] },
  { label: "Order", href: "/orders/new", icon: ClipboardList, tone: "blue", roles: ["owner", "office", "field"] },
];

export function visibleSections(role: Role): Section[] {
  return sections.filter((s) => s.roles.includes(role));
}

/** The most specific nav href that matches the current path ("/money/cash" beats "/money"). */
export function activeHref(pathname: string, hrefs: string[]): string | undefined {
  return hrefs
    .filter((href) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/")))
    .sort((a, b) => b.length - a.length)[0];
}

export const toneClasses: Record<Tone, string> = {
  blue: "bg-accent-soft text-accent",
  green: "bg-good-soft text-good",
  amber: "bg-warning-soft text-warning",
  teal: "bg-teal/10 text-teal",
  purple: "bg-purple/10 text-purple",
  grey: "bg-hairline text-ink-secondary",
};
