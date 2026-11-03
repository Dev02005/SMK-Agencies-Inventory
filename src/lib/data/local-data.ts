import "server-only";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { BankAccount, EmployeeDetails, Godown, Party, Product, Profile, Role, VehicleKind } from "./types";

/**
 * The firm's own records (firms, staff, godowns, vehicles), kept as JSON files in local-data/ on the computer that
 * runs the app, never in the code or in git (local-data/ is in .gitignore; the GitHub repository is public).
 * Each file replaces the matching sample records when it is there; without it the app runs on sample data.
 * With Supabase these become database tables and the folder goes away.
 */
const folder = join(process.cwd(), "local-data");

/** A local-data file's contents, or undefined when it is missing or not valid JSON. */
export function readLocal(file: string): unknown {
  try {
    return JSON.parse(readFileSync(join(folder, file), "utf8"));
  } catch {
    return undefined;
  }
}

/** Saves a local-data file in one step (written beside it, then swapped in), so a crash never leaves half a file. */
export function writeLocal(file: string, data: unknown) {
  mkdirSync(folder, { recursive: true });
  const path = join(folder, file);
  writeFileSync(`${path}.tmp`, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  renameSync(`${path}.tmp`, path);
}

const listIn = (file: string, key: string): unknown[] => {
  const data = readLocal(file) as Record<string, unknown> | undefined;
  return Array.isArray(data?.[key]) ? (data[key] as unknown[]) : [];
};

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const isText = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

// ── Staff: local-data/staff.json ─────────────────────────────────────────────────────────────────────────────────

type StaffRole = Exclude<Role, "owner">;
type LocalPerson = {
  name: string;
  designation: string;
  role: StaffRole;
  mobile: string;
  email?: string;
  /** A sample staff member whose records (bills, cash, attendance…) this person takes over. */
  replaces?: string;
  /** Ids of the godowns they look after. */
  godowns?: string[];
};

const staffRoles: StaffRole[] = ["office", "field", "godown", "driver"];

function isPerson(p: unknown): p is LocalPerson {
  const x = p as Partial<LocalPerson> | null;
  return Boolean(x && isText(x.name) && typeof x.mobile === "string" && typeof x.designation === "string" && staffRoles.includes(x.role as StaffRole));
}

// Read once when the server starts; restart the app after editing the file by hand.
const staff = listIn("staff.json", "staff").filter(isPerson);
const ownerEntry = (readLocal("staff.json") as { owner?: { name?: unknown; designation?: unknown; mobile?: unknown; email?: unknown } } | undefined)?.owner;

/** What the owner is called in the business ("Admin"), when the staff file says. */
export const ownerDesignation = isText(ownerEntry?.designation) ? ownerEntry.designation.trim() : undefined;

const personId = (p: LocalPerson) => p.replaces ?? `u-staff-${slug(p.name)}`;

function initialsOf(name: string) {
  const words = name.trim().split(/\s+/);
  return (words.length > 1 ? `${words[0][0]}${words[1][0]}` : name.trim().slice(0, 2)).toUpperCase();
}

/** The owner (their own name and mobile when the file has them), then the real staff or the sample staff. */
export function withLocalProfiles(sample: Profile[]): Profile[] {
  const owner = sample
    .filter((p) => p.role === "owner")
    .map((p) =>
      isText(ownerEntry?.name)
        ? {
            ...p,
            fullName: ownerEntry.name.trim(),
            initials: initialsOf(ownerEntry.name),
            mobile: typeof ownerEntry.mobile === "string" ? ownerEntry.mobile.trim() : p.mobile,
            email: typeof ownerEntry.email === "string" ? ownerEntry.email.trim() : undefined,
          }
        : p,
    );
  const people = staff.length === 0 ? sample.filter((p) => p.role !== "owner") : staff.map((p) => ({ id: personId(p), fullName: p.name.trim(), initials: initialsOf(p.name), mobile: p.mobile.trim(), email: p.email, role: p.role, active: true }));
  return [...owner, ...people];
}

/**
 * Employee records for the real staff, with their own designation. Joining date, salary and work areas come from
 * the sample person they replace, or the sample person in the same role, until they are entered for real.
 */
export function withLocalEmployees(sample: EmployeeDetails[], sampleProfiles: Profile[]): EmployeeDetails[] {
  if (staff.length === 0) return sample;
  const roleOf = (profileId: string) => sampleProfiles.find((p) => p.id === profileId)?.role;
  return staff.map((p) => {
    const base = sample.find((e) => e.profileId === p.replaces) ?? sample.find((e) => roleOf(e.profileId) === p.role) ?? sample[0];
    return { ...base, profileId: personId(p), designation: p.designation, vehicle: p.replaces ? base.vehicle : undefined };
  });
}

// ── Godowns: local-data/godowns.json, with in-charges from staff.json ─────────────────────────────────────────────

function isGodown(g: unknown): g is Godown {
  const x = g as Partial<Godown> | null;
  return Boolean(x && isText(x.id) && isText(x.name) && typeof x.place === "string");
}

const godowns = listIn("godowns.json", "godowns").filter(isGodown);

/** The real godowns (sample ones when there is no file), each with who looks after it. */
export function withLocalGodowns(sample: Godown[]): Godown[] {
  const list = godowns.length > 0 ? godowns.map((g) => ({ id: g.id, name: g.name.trim(), place: g.place.trim(), own: Boolean(g.own) })) : sample;
  const assigned = staff.filter((p) => Array.isArray(p.godowns) && p.godowns.length > 0);
  if (assigned.length === 0) return list;
  return list.map((g) => ({ ...g, inCharge: assigned.filter((p) => p.godowns!.includes(g.id)).map(personId) }));
}

// ── Suppliers: local-data/suppliers.json ──────────────────────────────────────────────────────────────────────────

type LocalSupplier = { id: string; name: string; brands?: string[]; place?: string; gstin?: string; mobile?: string };

function isSupplier(s: unknown): s is LocalSupplier {
  const x = s as Partial<LocalSupplier> | null;
  return Boolean(x && isText(x.id) && isText(x.name));
}

const suppliers = listIn("suppliers.json", "suppliers").filter(isSupplier);

/** The companies we buy from, with the brands they sell; one with a sample party's id takes over its records. */
export function withLocalSuppliers(sample: Party[]): Party[] {
  if (suppliers.length === 0) return sample;
  const brandsOf = (s: LocalSupplier) => (Array.isArray(s.brands) ? s.brands.filter(isText) : undefined);
  const merged = sample.map((p) => {
    const s = suppliers.find((x) => x.id === p.id);
    return s ? { ...p, kind: "company" as const, name: s.name.trim(), brands: brandsOf(s), place: s.place ?? p.place, gstin: s.gstin ?? p.gstin, mobile: s.mobile ?? p.mobile } : p;
  });
  const added = suppliers
    .filter((s) => !sample.some((p) => p.id === s.id))
    .map((s): Party => ({ id: s.id, name: s.name.trim(), kind: "company", place: s.place, gstin: s.gstin, mobile: s.mobile, brands: brandsOf(s), creditLimit: null, openingBalance: 0 }));
  return [...merged, ...added];
}

// ── Products: local-data/products.json (list rates saved from Settings › Products & rates) ─────────────────────────

type LocalProduct = { id: string; name?: string; brand: string; variant: string; category: Product["category"]; unit: Product["unit"]; listRate?: number; active?: boolean };

function isProduct(p: unknown): p is LocalProduct {
  const x = p as Partial<LocalProduct> | null;
  return Boolean(x && isText(x.id) && isText(x.brand) && isText(x.variant) && (x.category === "cement" || x.category === "steel") && (x.unit === "bag" || x.unit === "kg"));
}

const productEntries: LocalProduct[] = listIn("products.json", "products").filter(isProduct);

const toProduct = (p: LocalProduct, sample?: Product): Product => ({
  id: p.id,
  name: p.name?.trim() || `${p.brand.trim()} ${p.variant.trim()}`,
  brand: p.brand.trim(),
  variant: p.variant.trim(),
  category: p.category,
  unit: p.unit,
  listRate: typeof p.listRate === "number" && p.listRate >= 0 ? p.listRate : (sample?.listRate ?? 0),
  active: p.active ?? sample?.active ?? true,
});

/** The real products in place of sample ones with the same id, then the others; sample products nobody replaced stay. */
export function withLocalProducts(sample: Product[]): Product[] {
  if (productEntries.length === 0) return sample;
  const real = productEntries.map((p) => toProduct(p, sample.find((s) => s.id === p.id)));
  return [...real, ...sample.filter((s) => !productEntries.some((p) => p.id === s.id))];
}

/**
 * Saves a product (a new one, or a changed list rate) into products.json and into `products`, the list every screen
 * reads, so new bills use it straight away.
 */
export function saveLocalProduct(products: Product[], product: Product) {
  const entry: LocalProduct = { id: product.id, brand: product.brand, variant: product.variant ?? product.name, category: product.category, unit: product.unit, listRate: product.listRate, active: product.active };
  const at = productEntries.findIndex((p) => p.id === product.id);
  if (at >= 0) productEntries[at] = { ...productEntries[at], ...entry };
  else productEntries.push(entry);
  const live = products.findIndex((p) => p.id === product.id);
  if (live >= 0) products[live] = product;
  else products.push(product);
  writeLocal("products.json", { about: "What we sell, by company and type. List rates are set in Settings > Products & rates. Kept on this computer only.", products: productEntries });
}

// ── Bank accounts: local-data/banks.json ──────────────────────────────────────────────────────────────────────────

function isAccount(a: unknown): a is BankAccount {
  const x = a as Partial<BankAccount> | null;
  return Boolean(x && isText(x.id) && isText(x.bank) && isText(x.accountNo));
}

const accounts = listIn("banks.json", "accounts").filter(isAccount);

/** The firms' real business accounts in place of the sample ones; the owner's personal (sample) accounts stay. */
export function withLocalBanks(sample: BankAccount[]): BankAccount[] {
  if (accounts.length === 0) return sample;
  const business = accounts.map((a) => ({
    id: a.id,
    bank: a.bank.trim(),
    name: isText(a.name) ? a.name.trim() : a.bank.trim(),
    accountNo: a.accountNo.trim(),
    scope: "business" as const,
    openingBalance: Number(a.openingBalance) || 0,
    firmId: a.firmId,
    ifsc: a.ifsc?.trim().toUpperCase(),
    branch: a.branch?.trim(),
  }));
  return [...business, ...sample.filter((a) => a.scope === "personal")];
}

// ── Customers added in the app (New sale › New customer): local-data/customers.json ────────────────────────────────

function isCustomer(c: unknown): c is Party {
  const x = c as Partial<Party> | null;
  return Boolean(x && isText(x.id) && isText(x.name) && (x.kind === "customer" || x.kind === "sub_dealer"));
}

const customers: Party[] = listIn("customers.json", "customers")
  .filter(isCustomer)
  .map((c) => ({ ...c, creditLimit: typeof c.creditLimit === "number" ? c.creditLimit : null, openingBalance: Number(c.openingBalance) || 0 }));

/** The sample parties plus the customers added in the app. */
export function withLocalCustomers(sample: Party[]): Party[] {
  return [...sample, ...customers];
}

/** Saves a new customer and adds it to `parties` (the list every screen reads), so it can be billed at once. */
export function addLocalCustomer(parties: Party[], customer: Party) {
  customers.push(customer);
  parties.push(customer);
  writeLocal("customers.json", { about: "Customers and sub-dealers added in the app (New sale > New customer). Kept on this computer only.", customers });
}

// ── Vehicles: local-data/vehicles.json ────────────────────────────────────────────────────────────────────────────

/** Who a vehicle is: the rest of its record (papers, service, GPS) is built with the dated sample data. */
export type FleetEntry = { id: string; number: string; kind: VehicleKind; category: "own" | "godown" | "rented"; model: string };
type LocalVehicle = { number: string; kind: VehicleKind; category: FleetEntry["category"]; model?: string; replaces?: string };

const kinds: VehicleKind[] = ["lorry", "van", "car", "bike"];
const categories: FleetEntry["category"][] = ["own", "godown", "rented"];

function isVehicle(v: unknown): v is LocalVehicle {
  const x = v as Partial<LocalVehicle> | null;
  return Boolean(x && isText(x.number) && kinds.includes(x.kind as VehicleKind) && categories.includes(x.category as FleetEntry["category"]));
}

const vehicles = listIn("vehicles.json", "vehicles").filter(isVehicle);

/**
 * The real vehicles in place of the sample ones they name in "replaces" (keeping that vehicle's sample papers and
 * trips), the others added; sample vehicles nobody replaces stay.
 */
export function withLocalFleet(sample: FleetEntry[]): FleetEntry[] {
  if (vehicles.length === 0) return sample;
  const replaced = new Set(vehicles.flatMap((v) => (v.replaces ? [v.replaces] : [])));
  const real = vehicles.map((v) => ({ id: v.replaces ?? `v-${slug(v.number)}`, number: v.number.trim(), kind: v.kind, category: v.category, model: v.model?.trim() ?? "" }));
  return [...real, ...sample.filter((s) => !replaced.has(s.id))];
}
