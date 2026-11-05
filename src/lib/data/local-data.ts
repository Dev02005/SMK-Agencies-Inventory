import "server-only";
import { mobileOf } from "@/lib/mobile";
import { readRecord, writeRecord } from "./store";
import type { BankAccount, Chit, EmployeeDetails, Godown, Lorry, Party, Product, Profile, Rental, Role, VehicleKind } from "./types";

/**
 * The firm's own records (staff, godowns, suppliers, products, banks and vehicles, and the parties, lorries, chits,
 * rents and notes added in the app): one JSON record per list in the record store (store.ts: local-data/
 * on a computer, Supabase online), never in the code or in git. Each list replaces the matching sample records when
 * it is there; without it the app runs on sample data. They are changed only inside saving() (store.ts).
 */
const listIn = (file: string, key: string): unknown[] => {
  const data = readRecord(file) as Record<string, unknown> | undefined;
  return Array.isArray(data?.[key]) ? (data[key] as unknown[]) : [];
};

/** A record as written to its file: the `original` mark is added when it is read, not stored. */
function stored<T extends { original?: boolean }>(record: T): Omit<T, "original"> {
  const copy = { ...record };
  delete copy.original;
  return copy;
}

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const isText = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const isISODate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

// ── Staff: local-data/staff.json ─────────────────────────────────────────────────────────────────────────────────

type StaffRole = Exclude<Role, "owner">;
type LocalPerson = {
  name: string;
  designation: string;
  role: StaffRole;
  mobile: string;
  email?: string;
  /** A sample staff member whose records (bills, cash, tours…) this person takes over. */
  replaces?: string;
  /** Ids of the godowns they look after. */
  godowns?: string[];
};

const staffRoles: StaffRole[] = ["office", "field", "godown", "driver"];

function isPerson(p: unknown): p is LocalPerson {
  const x = p as Partial<LocalPerson> | null;
  return Boolean(x && isText(x.name) && typeof x.mobile === "string" && typeof x.designation === "string" && staffRoles.includes(x.role as StaffRole));
}

type OwnerEntry = { name?: unknown; designation?: unknown; mobile?: unknown; email?: unknown };

/** More people who sign in as the owner does and see everything (staff.json's "admins"); they are not employees. */
type LocalAdmin = { name: string; mobile: string; designation?: string; email?: string };

function isAdmin(a: unknown): a is LocalAdmin {
  const x = a as Partial<LocalAdmin> | null;
  return Boolean(x && isText(x.name) && typeof x.mobile === "string");
}

// Each list here is read by loadLocal(), at the end of this file.
let staff: LocalPerson[] = [];
let admins: LocalAdmin[] = [];
let ownerEntry: OwnerEntry | undefined;

/** What the owner is called in the business ("Admin"), when the staff file says. */
export let ownerDesignation: string | undefined;

const personId = (p: LocalPerson) => p.replaces ?? `u-staff-${slug(p.name)}`;
const adminId = (a: LocalAdmin) => `u-admin-${slug(a.name)}`;

function initialsOf(name: string) {
  const words = name.trim().split(/\s+/);
  return (words.length > 1 ? `${words[0][0]}${words[1][0]}` : name.trim().slice(0, 2)).toUpperCase();
}

// ── Profile edits: local-data/profiles.json (Settings › Account: own name and photo) ───────────────────────────────

/**
 * What each person changed about themself, keyed by their id: a name shown instead of the one on the staff list, and
 * a photo (a small square JPEG as a data URL). Kept apart from staff.json because a staff member's id comes from the
 * name there, and every sale, note and code is filed under that id.
 */
type ProfileEdit = { name?: string; photo?: string; photoAt?: string };
let profileEdits: Record<string, ProfileEdit> = {};

function readProfileEdits(): Record<string, ProfileEdit> {
  const people = (readRecord("profiles.json") as { people?: Record<string, unknown> } | undefined)?.people ?? {};
  const out: Record<string, ProfileEdit> = {};
  for (const [id, raw] of Object.entries(people)) {
    const x = raw as Partial<ProfileEdit> | null;
    if (!x || typeof x !== "object") continue;
    out[id] = {
      name: isText(x.name) ? x.name.trim() : undefined,
      photo: typeof x.photo === "string" && x.photo.startsWith("data:image/jpeg;base64,") ? x.photo : undefined,
      photoAt: typeof x.photoAt === "string" ? x.photoAt : undefined,
    };
  }
  return out;
}

/** This person's photo as a data URL, if they have one. */
export function profilePhoto(id: string): string | undefined {
  return profileEdits[id]?.photo;
}

/** Changes a person's own name and/or photo (null removes the photo); call it only inside saving(). */
export function saveLocalProfileEdit(id: string, change: { name?: string; photo?: string | null }) {
  const now = { ...profileEdits[id] };
  if (change.name !== undefined) now.name = change.name;
  if (change.photo === null) {
    delete now.photo;
    delete now.photoAt;
  } else if (change.photo !== undefined) {
    now.photo = change.photo;
    now.photoAt = Date.now().toString(36);
  }
  profileEdits = { ...profileEdits, [id]: now };
  writeRecord("profiles.json", {
    about: "Each person's own name and photo from Settings › Account, by their id. Delete someone's line to go back to the staff list's name and no photo.",
    people: profileEdits,
  });
}

/** A person with their own name and photo applied. */
function withEdits(p: Profile): Profile {
  const e = profileEdits[p.id];
  if (!e) return p;
  return {
    ...p,
    ...(e.name ? { fullName: e.name, initials: initialsOf(e.name) } : {}),
    ...(e.photo ? { photoVersion: e.photoAt ?? "1" } : {}),
  };
}

/** The owner (their own name and mobile when the file has them), the other admins, then the real staff or the sample staff. */
export function withLocalProfiles(sample: Profile[]): Profile[] {
  return listedProfiles(sample).map(withEdits);
}

function listedProfiles(sample: Profile[]): Profile[] {
  const entry = ownerEntry;
  const owner = sample
    .filter((p) => p.role === "owner")
    .map((p) =>
      isText(entry?.name)
        ? {
            ...p,
            fullName: entry.name.trim(),
            initials: initialsOf(entry.name),
            mobile: typeof entry.mobile === "string" ? mobileOf(entry.mobile) : p.mobile,
            email: typeof entry.email === "string" ? entry.email.trim() : undefined,
            original: true,
          }
        : p,
    );
  const others = admins.map((a) => ({ id: adminId(a), fullName: a.name.trim(), initials: initialsOf(a.name), mobile: mobileOf(a.mobile), email: a.email?.trim(), role: "owner" as const, active: true, original: true }));
  const people = staff.length === 0 ? sample.filter((p) => p.role !== "owner") : staff.map((p) => ({ id: personId(p), fullName: p.name.trim(), initials: initialsOf(p.name), mobile: mobileOf(p.mobile), email: p.email, role: p.role, active: true, original: true }));
  return [...owner, ...others, ...people];
}

/** What each of the other admins is called ("Admin" unless the file says). */
export function adminDesignations(): Record<string, string> {
  return Object.fromEntries(admins.map((a) => [adminId(a), a.designation?.trim() || "Admin"]));
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
    // A driver's vehicle comes from the vehicles (the one they are set on), never from the sample records.
    return { ...base, profileId: personId(p), designation: p.designation, vehicle: undefined };
  });
}

// ── Godowns: local-data/godowns.json, with in-charges from staff.json ─────────────────────────────────────────────

function isGodown(g: unknown): g is Godown {
  const x = g as Partial<Godown> | null;
  return Boolean(x && isText(x.id) && isText(x.name) && typeof x.place === "string");
}

let godowns: Godown[] = [];

/** The real godowns (sample ones when there is no file), each with who looks after it. */
export function withLocalGodowns(sample: Godown[]): Godown[] {
  const list = godowns.length > 0 ? godowns.map((g) => ({ id: g.id, name: g.name.trim(), place: g.place.trim(), own: Boolean(g.own), original: true })) : sample;
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

let suppliers: LocalSupplier[] = [];

/**
 * The companies we buy from, with the brands they sell. Once the real list is there, the sample companies are dropped
 * and a real one with a sample company's id takes none of its sample balance or details, so only real suppliers show.
 */
export function withLocalSuppliers(sample: Party[]): Party[] {
  if (suppliers.length === 0) return sample;
  const brandsOf = (s: LocalSupplier) => (Array.isArray(s.brands) ? s.brands.filter(isText) : undefined);
  const merged = sample.flatMap((p) => {
    const s = suppliers.find((x) => x.id === p.id);
    // Only what the supplier list says: no sample place, GSTIN, number or opening balance.
    if (s) return [{ id: p.id, kind: "company" as const, name: s.name.trim(), brands: brandsOf(s), place: s.place, gstin: s.gstin, mobile: s.mobile, creditLimit: null, openingBalance: 0, original: true }];
    return p.kind === "company" ? [] : [p];
  });
  const added = suppliers
    .filter((s) => !sample.some((p) => p.id === s.id))
    .map((s): Party => ({ id: s.id, name: s.name.trim(), kind: "company", place: s.place, gstin: s.gstin, mobile: s.mobile, brands: brandsOf(s), creditLimit: null, openingBalance: 0, original: true }));
  return [...merged, ...added];
}

// ── Products: local-data/products.json (added from Settings › Products; no rates: the owner prices each bill) ──────

type LocalProduct = { id: string; name?: string; brand: string; variant: string; category: Product["category"]; unit: Product["unit"]; active?: boolean };

function isProduct(p: unknown): p is LocalProduct {
  const x = p as Partial<LocalProduct> | null;
  return Boolean(x && isText(x.id) && isText(x.brand) && isText(x.variant) && (x.category === "cement" || x.category === "steel") && (x.unit === "bag" || x.unit === "kg"));
}

let productEntries: LocalProduct[] = [];

const toProduct = (p: LocalProduct, sample?: Product): Product => ({
  id: p.id,
  name: p.name?.trim() || `${p.brand.trim()} ${p.variant.trim()}`,
  brand: p.brand.trim(),
  variant: p.variant.trim(),
  category: p.category,
  unit: p.unit,
  active: p.active ?? sample?.active ?? true,
  original: true,
});

/** The real products in place of sample ones with the same id, then the others; sample products nobody replaced stay. */
export function withLocalProducts(sample: Product[]): Product[] {
  if (productEntries.length === 0) return sample;
  const real = productEntries.map((p) => toProduct(p, sample.find((s) => s.id === p.id)));
  return [...real, ...sample.filter((s) => !productEntries.some((p) => p.id === s.id))];
}

/** Saves a product into products.json and into `products`, the list every screen reads, so new bills offer it straight away. */
export function saveLocalProduct(products: Product[], product: Product) {
  const entry: LocalProduct = { id: product.id, brand: product.brand, variant: product.variant ?? product.name, category: product.category, unit: product.unit, active: product.active };
  const at = productEntries.findIndex((p) => p.id === product.id);
  if (at >= 0) productEntries[at] = { ...productEntries[at], ...entry };
  else productEntries.push(entry);
  // Marked as the firm's own straight away, as it would be when read back from the file.
  const saved = { ...product, original: true };
  const live = products.findIndex((p) => p.id === product.id);
  if (live >= 0) products[live] = saved;
  else products.push(saved);
  writeRecord("products.json", { about: "What we sell, by company and type. No rates: the owner prices each bill.", products: productEntries });
}

/** Deletes a product from products.json and from `products`; false for a sample product. */
export function removeLocalProduct(products: Product[], id: string): boolean {
  if (!removeFrom(productEntries, (p) => p.id === id)) return false;
  removeFrom(products, (p) => p.id === id);
  writeRecord("products.json", { about: "What we sell, by company and type. No rates: the owner prices each bill.", products: productEntries });
  return true;
}

// ── Bank accounts: local-data/banks.json ──────────────────────────────────────────────────────────────────────────

function isAccount(a: unknown): a is BankAccount {
  const x = a as Partial<BankAccount> | null;
  return Boolean(x && isText(x.id) && isText(x.bank) && isText(x.accountNo));
}

let accounts: BankAccount[] = [];

/**
 * The firms' real business accounts in place of the sample ones, and the owner's own personal accounts (an account
 * with "scope": "personal" in banks.json, added under Personal › Banks). No sample personal account is ever shown.
 */
export function withLocalBanks(sample: BankAccount[]): BankAccount[] {
  const real = accounts.map((a) => ({
    id: a.id,
    bank: a.bank.trim(),
    name: isText(a.name) ? a.name.trim() : a.bank.trim(),
    accountNo: a.accountNo.trim(),
    scope: a.scope === "personal" ? ("personal" as const) : ("business" as const),
    openingBalance: Number(a.openingBalance) || 0,
    firmId: a.firmId,
    ifsc: a.ifsc?.trim().toUpperCase(),
    branch: a.branch?.trim(),
    original: true,
  }));
  const business = real.some((a) => a.scope === "business") ? real.filter((a) => a.scope === "business") : sample.filter((a) => a.scope === "business");
  return [...business, ...real.filter((a) => a.scope === "personal")];
}

/** Adds one of the owner's personal accounts to banks.json (Personal › Banks › Add bank); call it only inside saving(). */
export function addLocalPersonalBank(account: Omit<BankAccount, "id" | "scope" | "original" | "firmId">): BankAccount {
  const file = (readRecord("banks.json") as Record<string, unknown> | undefined) ?? {};
  const list = Array.isArray(file.accounts) ? (file.accounts as BankAccount[]) : [];
  const saved: BankAccount = { ...account, id: `acc-personal-${Date.now().toString(36)}`, scope: "personal" };
  const next = [...list, saved];
  writeRecord("banks.json", {
    ...file,
    about: "The firms' business bank accounts (Money > Banks) and the owner's personal ones (scope personal; Personal > Banks). Account numbers are private. openingBalance is the balance on the day the books start.",
    accounts: next,
  });
  accounts = next.filter(isAccount);
  return { ...saved, original: true };
}

// ── Parties added in the app (Parties › New party, New sale › New customer): local-data/customers.json ────────────

const addedKinds: Party["kind"][] = ["customer", "sub_dealer", "company", "lorry_owner"];

function isCustomer(c: unknown): c is Party {
  const x = c as Partial<Party> | null;
  return Boolean(x && isText(x.id) && isText(x.name) && addedKinds.includes(x.kind as Party["kind"]));
}

let customers: Party[] = [];

/** The sample parties plus the parties added in the app. */
export function withLocalCustomers(sample: Party[]): Party[] {
  return [...sample, ...customers];
}

const writeCustomers = () =>
  writeRecord("customers.json", { about: "Parties added in the app (Parties > New party, New sale > New customer).", customers: customers.map(stored) });

/** Saves a new party and adds it to `parties` (the list every screen reads), so it can be used at once. */
export function addLocalCustomer(parties: Party[], customer: Party) {
  const saved = { ...customer, original: true };
  customers.push(saved);
  parties.push(saved);
  writeCustomers();
}

/** Takes the first item matching out of a list; false when there is none. */
function removeFrom<T>(list: T[], match: (item: T) => boolean): boolean {
  const at = list.findIndex(match);
  if (at < 0) return false;
  list.splice(at, 1);
  return true;
}

/** Deletes a party added in the app, or a supplier from suppliers.json; false for a sample party. */
export function removeLocalParty(parties: Party[], id: string): boolean {
  if (removeFrom(customers, (c) => c.id === id)) writeCustomers();
  else if (removeFrom(suppliers, (s) => s.id === id)) {
    const file = (readRecord("suppliers.json") as Record<string, unknown> | undefined) ?? {};
    writeRecord("suppliers.json", { ...file, suppliers });
  } else return false;
  removeFrom(parties, (p) => p.id === id);
  return true;
}

// ── Company lorries: local-data/lorries.json (Purchases › Lorry › New lorry purchase) ──────────────────────────────

function isLorry(l: unknown): l is Lorry {
  const x = l as Partial<Lorry> | null;
  return Boolean(
    x &&
      isText(x.id) &&
      isText(x.companyId) &&
      isText(x.companyName) &&
      isText(x.lorryNo) &&
      isISODate(x.invoiceDate) &&
      Array.isArray(x.lines) &&
      x.lines.every((line) => isText(line?.productId) && typeof line.qty === "number"),
  );
}

let lorries: Lorry[] = [];

/** The lorries entered in the app. */
export function localLorries(): Lorry[] {
  return lorries;
}

const writeLorries = () =>
  writeRecord("lorries.json", {
    about: "Company lorries bought to sell straight off the truck, and what each sold for.",
    lorries: lorries.map(stored),
  });

/** Saves a new lorry, or a lorry's sale update, into lorries.json. */
export function saveLocalLorry(lorry: Lorry) {
  const saved = { ...lorry, original: !lorry.sample };
  const at = lorries.findIndex((l) => l.id === lorry.id);
  if (at >= 0) lorries[at] = saved;
  else lorries.unshift(saved);
  writeLorries();
}

export function removeLocalLorry(id: string): boolean {
  if (!removeFrom(lorries, (l) => l.id === id)) return false;
  writeLorries();
  return true;
}

// ── The owner's chits and rents (Personal): local-data/chits.json, local-data/rents.json ───────────────────────────

const isMonth = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}$/.test(v);
const isScope = (v: unknown) => v === "business" || v === "personal";

function isChit(c: unknown): c is Chit {
  const x = c as Partial<Chit> | null;
  return Boolean(
    x &&
      isText(x.id) &&
      isText(x.organiser) &&
      isScope(x.scope) &&
      typeof x.totalValue === "number" &&
      typeof x.months === "number" &&
      typeof x.instalment === "number" &&
      isISODate(x.startDate) &&
      typeof x.dueDay === "number" &&
      typeof x.paidMonths === "number",
  );
}

function isRental(r: unknown): r is Rental {
  const x = r as Partial<Rental> | null;
  return Boolean(
    x &&
      isText(x.id) &&
      isText(x.property) &&
      (x.direction === "received" || x.direction === "paid") &&
      isText(x.counterparty) &&
      typeof x.monthlyRent === "number" &&
      typeof x.advance === "number" &&
      typeof x.dueDay === "number" &&
      isISODate(x.agreementEnd) &&
      isMonth(x.paidThrough) &&
      isScope(x.scope),
  );
}

let chits: Chit[] = [];
let rentals: Rental[] = [];

/** Puts a record in its list, replacing the one with the same id. */
function upsert<T extends { id: string }>(list: T[], record: T) {
  const at = list.findIndex((x) => x.id === record.id);
  if (at >= 0) list[at] = record;
  else list.push(record);
}

export function localChits(): Chit[] {
  return chits;
}

/** Saves a new chit, or an instalment or lifting recorded on one. */
export function saveLocalChit(chit: Chit) {
  upsert(chits, { ...chit, original: true });
  writeRecord("chits.json", { about: "The owner's chits, with the instalments recorded in the app (Personal > Chits).", chits: chits.map(stored) });
}

export function removeLocalChit(id: string): boolean {
  if (!removeFrom(chits, (c) => c.id === id)) return false;
  writeRecord("chits.json", { about: "The owner's chits, with the instalments recorded in the app (Personal > Chits).", chits: chits.map(stored) });
  return true;
}

export function localRentals(): Rental[] {
  return rentals;
}

/** Saves a new rent, or a month's rent recorded on one. */
export function saveLocalRental(rental: Rental) {
  upsert(rentals, { ...rental, original: true });
  writeRecord("rents.json", { about: "Rent received from tenants and rent paid, with each month recorded in the app (Personal > Rents).", rents: rentals.map(stored) });
}

export function removeLocalRental(id: string): boolean {
  if (!removeFrom(rentals, (r) => r.id === id)) return false;
  writeRecord("rents.json", { about: "Rent received from tenants and rent paid, with each month recorded in the app (Personal > Rents).", rents: rentals.map(stored) });
  return true;
}

// ── Destinations we deliver to (New sale › Destination): local-data/destinations.json ──────────────────────────────

let destinations: string[] = [];

export function localDestinations(): string[] {
  return destinations;
}

const writeDestinations = () =>
  writeRecord("destinations.json", { about: "Villages and towns we deliver to (New sale > Destination; Add destination adds more).", destinations });

export function addLocalDestination(name: string) {
  destinations.push(name);
  writeDestinations();
}

export function removeLocalDestination(name: string): boolean {
  if (!removeFrom(destinations, (d) => d === name)) return false;
  writeDestinations();
  return true;
}

// ── Drivers of rented vehicles (New sale › Rent › Driver): local-data/rent-drivers.json ───────────────────────────

let rentDrivers: string[] = [];

export function localRentDrivers(): string[] {
  return rentDrivers;
}

const writeRentDrivers = () =>
  writeRecord("rent-drivers.json", { about: "Drivers of rented vehicles (New sale > Rent > Driver; Add driver adds more).", drivers: rentDrivers });

export function addLocalRentDriver(name: string) {
  rentDrivers.push(name);
  writeRentDrivers();
}

export function removeLocalRentDriver(name: string): boolean {
  if (!removeFrom(rentDrivers, (d) => d === name)) return false;
  writeRentDrivers();
  return true;
}

// ── Quick notes (the floating notes ball): local-data/notes.json ──────────────────────────────────────────────────

export type StoredNote = { id: string; profileId: string; text: string; at: string };

function isNote(n: unknown): n is StoredNote {
  const x = n as Partial<StoredNote> | null;
  return Boolean(x && isText(x.id) && isText(x.profileId) && isText(x.text) && isText(x.at));
}

let notes: StoredNote[] = [];

const writeNotes = () => writeRecord("notes.json", { about: "Each person's quick notes from the floating notes ball.", notes });

/** One person's quick notes, newest first. */
export function notesOf(profileId: string): StoredNote[] {
  return notes.filter((n) => n.profileId === profileId);
}

export function addLocalNote(note: StoredNote) {
  notes.unshift(note);
  writeNotes();
}

/** Removes one of that person's notes; false when it isn't theirs or is already gone. */
export function removeLocalNote(profileId: string, id: string): boolean {
  const at = notes.findIndex((n) => n.id === id && n.profileId === profileId);
  if (at < 0) return false;
  notes.splice(at, 1);
  writeNotes();
  return true;
}

// ── Vehicles: local-data/vehicles.json ────────────────────────────────────────────────────────────────────────────

/** Who a vehicle is: the rest of its record (papers, service, GPS) is built with the dated sample data. */
export type FleetEntry = {
  id: string;
  number: string;
  kind: VehicleKind;
  category: "own" | "godown" | "rented";
  model: string;
  /** A rented vehicle's own driver. */
  rentDriver?: { name: string; mobile?: string };
  /** Our own vehicle's driver (one of the staff), set by the owner on the driver's page. */
  driverId?: string;
  original?: boolean;
};
/** `driverName` and `driverMobile`: a rented vehicle's own driver, filled in on a Rent delivery when it is chosen. */
type LocalVehicle = {
  number: string;
  kind: VehicleKind;
  category: FleetEntry["category"];
  model?: string;
  replaces?: string;
  driverName?: string;
  driverMobile?: string;
  /** Our own vehicle's driver: a staff member's id. */
  driver?: string;
};

const kinds: VehicleKind[] = ["lorry", "van", "car", "bike"];
const categories: FleetEntry["category"][] = ["own", "godown", "rented"];

function isVehicle(v: unknown): v is LocalVehicle {
  const x = v as Partial<LocalVehicle> | null;
  return Boolean(x && isText(x.number) && kinds.includes(x.kind as VehicleKind) && categories.includes(x.category as FleetEntry["category"]));
}

let vehicles: LocalVehicle[] = [];

/**
 * The real vehicles once any are entered, each in place of the sample one it names in "replaces" (keeping that
 * vehicle's sample papers and trips); sample vehicles nobody replaces are left out. With none entered, the sample fleet.
 */
export function withLocalFleet(sample: FleetEntry[]): FleetEntry[] {
  if (vehicles.length === 0) return sample;
  const real = vehicles.map((v) => ({
    id: v.replaces ?? `v-${slug(v.number)}`,
    number: v.number.trim(),
    kind: v.kind,
    category: v.category,
    model: v.model?.trim() ?? "",
    rentDriver: isText(v.driverName) ? { name: v.driverName.trim(), mobile: typeof v.driverMobile === "string" && mobileOf(v.driverMobile).length === 10 ? mobileOf(v.driverMobile) : undefined } : undefined,
    driverId: v.category !== "rented" && isText(v.driver) ? v.driver : undefined,
    original: true,
  }));
  return real;
}

// ── The owner's edits to a driver: their mobile number (staff.json) and the vehicle they drive (vehicles.json) ──────

/** Whether this id is one of the staff in staff.json. */
export function isLocalStaff(id: string) {
  return staff.some((p) => personId(p) === id);
}

/** Changes a staff member's mobile number and/or designation in staff.json; call it only inside saving(). False when they aren't there. */
export function saveLocalStaffFields(id: string, change: { mobile?: string; designation?: string }): boolean {
  const file = (readRecord("staff.json") as Record<string, unknown> | undefined) ?? {};
  const list = Array.isArray(file.staff) ? (file.staff as LocalPerson[]) : [];
  const at = list.findIndex((p) => isPerson(p) && personId(p) === id);
  if (at < 0) return false;
  const next = list.map((p, i) => (i === at ? { ...p, ...(change.mobile !== undefined ? { mobile: change.mobile } : {}), ...(change.designation !== undefined ? { designation: change.designation } : {}) } : p));
  writeRecord("staff.json", { ...file, staff: next });
  staff = next.filter(isPerson);
  return true;
}

/**
 * Puts a driver on one of our own vehicles (or on none, with ""): they come off any other vehicle, and a driver
 * already on that vehicle comes off it. Call it only inside saving(); false when the vehicle isn't one of ours.
 */
export function saveLocalDriverVehicle(driverId: string, vehicleId: string): boolean {
  const file = (readRecord("vehicles.json") as Record<string, unknown> | undefined) ?? {};
  const list = Array.isArray(file.vehicles) ? (file.vehicles as LocalVehicle[]) : [];
  const idOf = (v: LocalVehicle) => v.replaces ?? `v-${slug(v.number)}`;
  if (vehicleId && !list.some((v) => isVehicle(v) && idOf(v) === vehicleId && v.category !== "rented")) return false;
  const next = list.map((v) => {
    if (!isVehicle(v)) return v;
    if (idOf(v) === vehicleId) return { ...v, driver: driverId };
    if (v.driver === driverId) {
      const rest = { ...v };
      delete rest.driver;
      return rest;
    }
    return v;
  });
  writeRecord("vehicles.json", { ...file, vehicles: next });
  vehicles = next.filter(isVehicle);
  return true;
}

/** What the owner can change on a vehicle (Vehicles › the vehicle › Edit). */
export type VehicleChange = {
  number: string;
  kind: VehicleKind;
  category: FleetEntry["category"];
  model: string;
  /** Rented: its own driver. */
  driverName?: string;
  driverMobile?: string;
  /** Own lorry or van: the staff driver on it ("" for none). */
  driver?: string;
};

/**
 * Changes one of the firm's own vehicles in vehicles.json; call it only inside saving(). Returns its id afterwards (a
 * new number gives a vehicle without "replaces" a new id), or null when it isn't one of them. A staff driver put on
 * it comes off any other vehicle.
 */
export function saveLocalVehicle(id: string, change: VehicleChange): string | null {
  const file = (readRecord("vehicles.json") as Record<string, unknown> | undefined) ?? {};
  const list = Array.isArray(file.vehicles) ? (file.vehicles as LocalVehicle[]) : [];
  const idOf = (v: LocalVehicle) => v.replaces ?? `v-${slug(v.number)}`;
  const at = list.findIndex((v) => isVehicle(v) && idOf(v) === id);
  if (at < 0) return null;
  const old = list[at];
  const updated: LocalVehicle = { number: change.number, kind: change.kind, category: change.category, model: change.model || undefined, ...(old.replaces ? { replaces: old.replaces } : {}) };
  if (change.category === "rented") {
    if (change.driverName) updated.driverName = change.driverName;
    if (change.driverMobile) updated.driverMobile = change.driverMobile;
  } else if (change.driver) {
    updated.driver = change.driver;
  }
  const newId = idOf(updated);
  if (list.some((v, i) => i !== at && isVehicle(v) && idOf(v) === newId)) return null;
  const next = list.map((v, i) => {
    if (i === at) return updated;
    if (updated.driver && v.driver === updated.driver) {
      const rest = { ...v };
      delete rest.driver;
      return rest;
    }
    return v;
  });
  writeRecord("vehicles.json", { ...file, vehicles: next });
  vehicles = next.filter(isVehicle);
  return newId;
}

// ── Reading the lists ─────────────────────────────────────────────────────────────────────────────────────────────

/** Reads every list from the records: when the server starts, and again whenever they change (index.ts). */
export function loadLocal() {
  staff = listIn("staff.json", "staff").filter(isPerson);
  admins = listIn("staff.json", "admins").filter(isAdmin);
  ownerEntry = (readRecord("staff.json") as { owner?: OwnerEntry } | undefined)?.owner;
  ownerDesignation = isText(ownerEntry?.designation) ? ownerEntry.designation.trim() : undefined;
  godowns = listIn("godowns.json", "godowns").filter(isGodown);
  suppliers = listIn("suppliers.json", "suppliers").filter(isSupplier);
  productEntries = listIn("products.json", "products").filter(isProduct);
  accounts = listIn("banks.json", "accounts").filter(isAccount);
  customers = listIn("customers.json", "customers")
    .filter(isCustomer)
    .map((c) => ({ ...c, creditLimit: typeof c.creditLimit === "number" ? c.creditLimit : null, openingBalance: Number(c.openingBalance) || 0, original: true }));
  lorries = listIn("lorries.json", "lorries")
    .filter(isLorry)
    .map((l) => ({ ...l, original: !l.sample }));
  chits = listIn("chits.json", "chits")
    .filter(isChit)
    .map((c) => ({ ...c, original: true }));
  rentals = listIn("rents.json", "rents")
    .filter(isRental)
    .map((r) => ({ ...r, original: true }));
  destinations = listIn("destinations.json", "destinations")
    .filter(isText)
    .map((d) => d.trim().replace(/\s+/g, " "));
  rentDrivers = listIn("rent-drivers.json", "drivers")
    .filter(isText)
    .map((d) => d.trim().replace(/\s+/g, " "));
  notes = listIn("notes.json", "notes").filter(isNote);
  vehicles = listIn("vehicles.json", "vehicles").filter(isVehicle);
  profileEdits = readProfileEdits();
}

loadLocal();
