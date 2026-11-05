# Project: SKA app (Sri Kameswari Agencies)

## What it is
The private business and personal app for Sri Kameswari Agencies, a cement and steel dealer in Polaki (Srikakulam district). The owner, two other admins and the office, sales, godown and driver staff use it on phones and computers for godown sales, company lorries sold straight off the truck, purchases, stock, money (receipts, payments, staff cash, banks), parties, people, vehicles and reports, plus the owner's PIN-locked Personal area. Stage: in daily use while being built. The firm's own lists (staff, suppliers, godowns, products, banks, vehicles, customers, lorries, profiles) are real and saved in Supabase; godown sales and godown purchases still save as samples only, and a few sample bills and purchases (tagged "Sample") are kept on purpose to try the screens.

## Tech stack
- Language/framework: Next.js 16 (App Router, Cache Components, Turbopack) · React 19 · TypeScript · Tailwind CSS 4 · Lucide icons. Light theme only.
- Database: Supabase. The firm's records are one JSON record per list in the table `ska_records`, read and written through `src/lib/data/store.ts` (locked table; only its two functions with `SKA_DATA_SECRET`). Without that secret the records live in `local-data/` on this computer.
- Hosting: Vercel (region `cdg1`, next to the Supabase project in eu-west-3). GitHub: `Dev02005/SMK-Agencies-Inventory` (public), branch `main`.

## How to run
- Install: `npm install`
- Run: `npm run dev` (http://localhost:3000; sign in with a staff mobile number and the 6-digit code, 000000 until changed)
- Test: there is no test suite. Check with `npx tsc --noEmit` and `npm run lint`, then try the screen in the browser.
- Records: `npm run records:download` (Supabase to `local-data/`, a backup) and `npm run records:upload` (the other way; add `-- --replace` to overwrite).

## Folder structure
- `src/app/(app)/` — the signed-in screens: sales, purchases, money, parties, people, fleet (vehicles), stock, reports, personal, settings, notifications.
- `src/app/login/` — two-step sign-in (mobile number, then 6-digit code).
- `src/components/` — shared UI (`ui/`), forms, home cards, shell (sidebar, tab bar, profile menu), lorries, money, print.
- `src/lib/data/` — the data layer every screen calls: `index.ts` (all reads and saves), `local-data.ts` (the firm's own records), `store.ts` (Supabase or `local-data/`), `sample*.ts` (sample data), `types.ts`.
- `src/lib/` — rules and helpers: `access.ts` (who opens what), `passwords.ts` / `password-rules.ts` (sign-in codes), `lorries.ts`, `date-filter.ts`, formatting.
- `src/proxy.ts` — checks the session before every page (drivers do not sign in).
- `local-data/` — this computer's copy of the records: real staff names and phone numbers. In `.gitignore`; never commit it.
- `supabase/migrations/` — SQL for the records table and the read-only views.
- `scripts/records.mjs` — copies records between `local-data/` and Supabase.

## Rules for any AI agent
1. Read PROGRESS.md, TODO.md and DECISIONS.md before starting work.
2. Before ending a session, update PROGRESS.md and TODO.md.
3. Log any important technical choice in DECISIONS.md.
4. Ask before deleting files, changing the database schema, or adding big dependencies.
5. The GitHub repository is public: never commit `.env*`, `local-data/`, phone numbers, account numbers or keys. Scan the diff before every push.
6. Saves that change the firm's real records (Supabase) are real: back up a record before removing anything from it, and don't test by saving into real records unless the owner agrees.
7. Sample data must never reach a real party's ledger, balance or ageing; mark kept samples (`demo: true`) and tag them "Sample" on screen.
8. Read data only through `src/lib/data/index.ts`; staff ids come from their names, so change a person's name through `profiles.json` (never rename them in `staff.json`).
9. Use Tailwind and the existing `src/components/ui/` pieces (Field, Select, Button, SectionCard, AddPanel, OtherCharges) rather than new styling.
10. After a change: `npx tsc --noEmit`, `npm run lint`, then check the screen in the browser.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
