import "server-only";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Where the firm's own records are kept. Each list (staff.json, godowns.json, lorries.json…) is one JSON record.
 *
 * - On a computer: JSON files in local-data/, never in the code or in git (local-data/ is in .gitignore; the GitHub
 *   repository is public).
 * - Online, once SKA_DATA_SECRET is set beside the Supabase address and publishable key: rows of one locked table in
 *   Supabase (supabase/migrations/20261103000000_records.sql), so the site on Vercel has them too. The publishable
 *   key alone can't read or write that table; only its two functions can, and only with the data key.
 *
 * Online the site runs on several servers at once, so each request first fetches what changed since this server
 * last looked (syncRecords), and a change is saved with the version each record was read at (saving), so two
 * people saving the same list at the same moment can't wipe out each other's change.
 */
const folder = join(process.cwd(), "local-data");

const online = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  const secret = process.env.SKA_DATA_SECRET?.trim();
  return url && key && secret ? { url, key, secret } : undefined;
})();

/** True when the records are in Supabase, not in local-data/ on this computer. */
export const recordsOnline = Boolean(online);

// Online: each record as last fetched or changed here, with the version it was read at (0 for one not saved yet).
const held = new Map<string, { data: unknown; version: number }>();
// The newest version this server has fetched; -1 until the first fetch, and again after a save that didn't go through.
let since = -1;
let pending: { name: string; data: unknown; base: number }[] = [];
let changes = 0;
const reloaders: (() => void)[] = [];

/** Goes up whenever the records change, here or on another server, so anything worked out from them is worked out again. */
export const dataVersion = () => changes;

/** Runs `reload` after records changed on another server are fetched, so the lists built from them are built again. */
export function whenRecordsChange(reload: () => void) {
  reloaders.push(reload);
}

/** A record's contents, or undefined when there is none (or, on a computer, the file isn't valid JSON). */
export function readRecord(name: string): unknown {
  if (online) return held.get(name)?.data;
  try {
    return JSON.parse(readFileSync(join(folder, name), "utf8"));
  } catch {
    return undefined;
  }
}

/**
 * Replaces a record; call it only inside saving(). On a computer the file is written at once (beside it, then
 * swapped in, so a crash never leaves half a file); online it is sent when the change is done.
 */
export function writeRecord(name: string, data: unknown) {
  changes++;
  if (online) {
    const base = held.get(name)?.version ?? 0;
    held.set(name, { data, version: base });
    pending = [...pending.filter((p) => p.name !== name), { name, data, base }];
    return;
  }
  mkdirSync(folder, { recursive: true });
  const path = join(folder, name);
  writeFileSync(`${path}.tmp`, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  renameSync(`${path}.tmp`, path);
}

/** One of the table's two functions (supabase/migrations/20261103000000_records.sql), with the data key. */
async function call(fn: "ska_records_since" | "ska_save_records", args: Record<string, unknown>): Promise<unknown> {
  const { url, key, secret } = online!;
  const response = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    // Built now, before anything else can change the lists being sent.
    body: JSON.stringify({ p_key: secret, ...args }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`The records database didn't answer (${response.status}): ${(await response.text()).slice(0, 200)}`);
  return response.json();
}

/** Online: fetches the records changed since this server last looked, then rebuilds the lists if any did. */
export async function syncRecords() {
  if (!online) return;
  const first = since < 0;
  const rows = (await call("ska_records_since", { p_since: Math.max(since, 0) })) as { name: string; data: unknown; version: number }[];
  let changed = first;
  for (const row of rows) {
    since = Math.max(since, row.version);
    // A fetch that started earlier can finish later; it never replaces a newer copy.
    if (row.version > (held.get(row.name)?.version ?? 0)) {
      held.set(row.name, { data: row.data, version: row.version });
      changed = true;
    }
  }
  since = Math.max(since, 0);
  if (!changed) return;
  changes++;
  for (const reload of reloaders) reload();
}

/** Starts again from the database: the next syncRecords() fetches every record and rebuilds every list. */
function forget() {
  held.clear();
  since = -1;
}

/** Online: sends the change just made, all or nothing; false when someone else saved one of its records first. */
async function saveRecords(): Promise<boolean> {
  if (!online || pending.length === 0) return true;
  const batch = pending;
  pending = [];
  let saved: Record<string, number> | null;
  try {
    saved = (await call("ska_save_records", { p_records: batch })) as Record<string, number> | null;
  } catch (error) {
    forget();
    throw error;
  }
  if (!saved) {
    forget();
    return false;
  }
  for (const { name } of batch) {
    const record = held.get(name);
    if (record && saved[name] > record.version) held.set(name, { ...record, version: saved[name] });
  }
  return true;
}

// Saves on this server wait for each other, so only a save on another server can ever meet one halfway.
let queue: Promise<unknown> = Promise.resolve();

/**
 * Makes a change to the records and saves it: on the latest records and, online, again on newer ones if someone else
 * saved one of the same records first. `change` does its checks and writes without waiting for anything, so no other
 * request can change the same lists halfway through.
 */
export function saving<T>(change: () => T): Promise<T> {
  const run = queue.then(() => saveNow(change));
  queue = run.catch(() => undefined);
  return run;
}

async function saveNow<T>(change: () => T): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    await syncRecords();
    let result: T;
    try {
      result = change();
    } catch (error) {
      // Nothing half-made is sent, and the lists are built again from what is saved.
      pending = [];
      forget();
      throw error;
    }
    if (await saveRecords()) return result;
    if (attempt === 5) throw new Error("Couldn't save: someone else kept changing the same records. Try again.");
    // Someone on another server saved first: wait a moment (longer each time, and never in step with them), then again.
    await new Promise((resolve) => setTimeout(resolve, attempt * 50 + Math.random() * 100));
  }
}
