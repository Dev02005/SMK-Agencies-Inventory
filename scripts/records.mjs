// Copies the firm's records between this computer (local-data/) and Supabase (src/lib/data/store.ts).
//   npm run records:upload     local-data/*.json to Supabase. Records already online are left alone; add
//                              `-- --replace` to overwrite them with this computer's copy.
//   npm run records:download   Supabase to local-data/, as a backup copy on this computer.
// Uses NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SKA_DATA_SECRET from .env.local.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
const secret = process.env.SKA_DATA_SECRET?.trim();
if (!url || !key || !secret) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SKA_DATA_SECRET in .env.local first.");
  process.exit(1);
}

const folder = join(process.cwd(), "local-data");
const isRecordName = (name) => /^[a-z0-9-]+\.json$/.test(name);

async function call(fn, args) {
  const response = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ p_key: secret, ...args }),
  });
  if (!response.ok) throw new Error(`${fn} failed (${response.status}): ${await response.text()}`);
  return response.json();
}

const [mode, flag] = process.argv.slice(2);
const online = new Map((await call("ska_records_since", { p_since: 0 })).map((r) => [r.name, r]));

if (mode === "upload") {
  const records = [];
  for (const name of readdirSync(folder).filter(isRecordName).sort()) {
    if (online.has(name) && flag !== "--replace") {
      console.log(`  already online, left alone: ${name}`);
      continue;
    }
    records.push({ name, data: JSON.parse(readFileSync(join(folder, name), "utf8")), base: online.get(name)?.version ?? 0 });
  }
  if (records.length === 0) {
    console.log("Nothing to upload.");
  } else if (!(await call("ska_save_records", { p_records: records }))) {
    console.error("Someone saved records at the same moment; run it again.");
    process.exit(1);
  } else {
    for (const r of records) console.log(`  uploaded: ${r.name}`);
  }
} else if (mode === "download") {
  mkdirSync(folder, { recursive: true });
  for (const [name, r] of online) {
    if (!isRecordName(name)) continue;
    writeFileSync(join(folder, name), `${JSON.stringify(r.data, null, 2)}\n`, "utf8");
    console.log(`  saved: local-data/${name}`);
  }
  if (online.size === 0) console.log("There are no records online yet.");
} else {
  console.error("Use npm run records:upload or npm run records:download.");
  process.exit(1);
}
