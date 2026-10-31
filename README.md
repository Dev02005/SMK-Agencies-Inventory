# SKA app

The private business and personal app for Sri Kameswari Agencies (cement and steel, Polaki). The project plan and design plan live in the shared Claude Doc; this folder is the code.

Stack: Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage) · Lucide icons. Light theme only.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. The app opens on the sign-in page; the sample login is ID `123456789`, password `123456789` (change them with `SKA_LOGIN_ID` and `SKA_LOGIN_PASSWORD`). Everyone is signed out at 12 midnight India time.

Without Supabase keys the app runs on the sample data in `src/lib/data` and shows a "Sample data" chip. The sample records follow the real calendar: they are rebuilt each day around today's date in India, so "today" on every screen is the real today.

## What is built (frontend phases F0–F6)

Every screen runs on sample data from `src/lib/data` and shows a "Sample data" chip; forms check their input and show a "not stored" message instead of saving.

| Area | Screens |
| --- | --- |
| Shell | Sidebar (desktop), icon rail (tablet), tab bar + quick-add sheet (phone), search (Ctrl K), profile menu with **View as** role switcher, Account and Sign out |
| Sign-in | `/login` first: every other page needs a session (`src/proxy.ts` checks it before the page renders, the app layout checks it again). The session is a signed, httpOnly cookie that ends at 12 midnight India time; an open app signs itself out at midnight (`midnight-sign-out.tsx`) |
| Account | `/account`: who is signed in, login ID, when they signed in, a countdown to the midnight sign-out, change password, sign out |
| Home | `/` dashboard with today's real date and a live clock: today's sales, cash with staff, collected / outstanding / overdue, approvals, dues |
| Sales | `/sales` list with filters, `/sales/new`, `/sales/[id]` bill, `/sales/[id]/print` A4 bill |
| Quotations | `/quotations`, `/quotations/new`, `/quotations/[id]` in the SKA paper format, printable |
| Purchases | `/purchases`, `/purchases/new`, `/purchases/[id]` |
| Parties | `/parties` with balances, `/parties/[id]` ledger (detailed / summary) and ageing, `/parties/new` |
| Money | `/money` receipts and payments, `/money/receipts/new`, `/money/payments/new` |
| Stock | `/stock` godown balances and movements, `/stock/inward/new` |
| Settings | `/settings`, firm, godowns, products & rates, users & roles |
| Staff cash | `/money/cash` everyone's cash today, `/money/cash/[holder]` day-by-day cash book with counts, `/money/cash/handover/new` |
| Expenses | `/money/expenses` by head with this month's split, `/money/expenses/new` with fixed heads, paid-from and vehicle/staff/godown tag |
| Advances | `/money/advances` fixed-price cement commitments and plain advances, `/money/advances/[id]` bags supplied and left, `/money/advances/new` |
| Ageing & reminders | `/money/ageing` 0–7 / 8–30 / 31–60 / 61–90 / 90+ grid, reminder selection and history |
| Bad debts, banks | `/money/bad-debts` write-offs (owner only); `/money/banks` with **Add bank** (`/money/banks/add`: the IFSC fills in the bank); `/money/banks/[id]` with every transaction and a running balance, **Add entry** and **Import statement**; `/money/banks/new` |
| Bank statement import | On a bank's page, choose or drop the statement PDF (`src/lib/statement-pdf.ts` reads it in the browser with pdf.js; nothing is uploaded). `src/lib/statement-parser.ts` finds the transactions table from its column headings, so SBI, HDFC, Union Bank, APGB, KVB and most other Indian banks read the same way, and checks every row against the statement's running balance. The preview shows the bank, account and period, warns if the account number doesn't match, leaves rows already in the account unticked, asks for the password of locked PDFs, and saves the ticked rows. Tested on real SBI, HDFC, Union Bank, APGB and KVB statements: 74 of 74 rows read and balanced |
| Personal | `/personal` behind a 4-digit PIN (sample PIN 1234), owner only: overview, chits, rents, insurance, personal banks, notes, documents |
| Home by role | `/` shows a different screen per role: owner/office dashboard, field staff (cash, targets, visits, who to collect from), godown (bills to load, lorries arriving, stock, orders), driver (today's deliveries, cash, renewals) |
| People | `/people` staff with today's attendance, `/people/[id]`, `/people/new`, `/people/mapping` (sub-dealers per staff), `/people/attendance` (check in, today, month), `/people/tours`, `/people/targets`, `/people/salary` (salary sheet, loans and advances) |
| Orders | `/orders` pending / new / confirmed / dispatched, `/orders/[id]` ordered vs sent with bills, `/orders/new` |
| Stock movement | `/stock/transfers` (+ `/new`) between godowns with in-transit status, `/stock/lorries` lorry sold straight off the truck, `/stock/suspense` loads sent before the buyer is known |
| Vehicles | `/fleet` papers due and service due per vehicle, `/fleet/[id]` papers, health, service log, running cost; `/fleet/trips`; `/fleet/map` (Leaflet + OpenStreetMap); `/fleet/freight` chart with calculator; `/fleet/drivers` driver cash ledger and hired lorries |
| Reports | `/reports` hub and `/reports/[report]`: daybook, sales summary (by party, product, staff or day), discounts and rate changes, outstanding and ageing, collections, expenses, stock summary, attendance, vehicle costs, activity log. Each has period and grouping options, **Excel** (a real .xlsx made in the browser, numbers stay numbers) and **PDF / Print** (A4 with the firm header; wide reports print landscape) |
| Notifications | Bell with unread count in the top bar and `/notifications`: approvals, payment reminders due, who to collect from, vehicle papers and service, low stock, new and pending orders, lorries arriving, transfers, suspense loads, cash above the limit, deliveries, personal dues. Each role sees its own; field staff and drivers only theirs |
| Reminder messages | `/settings/reminders`: when reminders go (first after, repeat, stop after, time, skip Sundays, SMS if WhatsApp fails) and the message templates with fill-in fields, SMS length count and a preview with real parties. Includes a Telugu draft for the owner to check |
| Install | Installs like an app on Android, iPhone, iPad, Windows, Mac and ChromeOS: PNG icons (192, 512, maskable, Apple), manifest with shortcuts (new bill, receipt, notifications). The install card offers one-tap install in Chrome, Edge and Samsung Internet, shows Share → Add to Home Screen on iPhone/iPad, File → Add to Dock in Safari on a Mac, and the browser menu in Firefox on Android; "Install app" is also in the profile menu |
| Offline | A service worker (`public/sw.js`, production builds only) keeps the app's own files so the installed app opens fast and shows `/offline` with no signal; pages and figures are never stored on the device. Next.js's offline mode shows a banner and retries page loads and saves when the connection returns |
| Dropdowns | Every dropdown is the app's own (`src/components/ui/select.tsx`), so it looks the same on every device: a panel under the field on tablets and computers, a bottom sheet with large rows on phones, search for lists longer than eight, full keyboard and screen-reader support |
| SEO and sharing | The sign-in page is indexable with a description, canonical address, business details for Google (schema.org) and a branded preview image for WhatsApp and social links; `robots.txt` and `sitemap.xml` list only it. Every page behind sign-in is marked noindex, because it holds business records |

The Personal PIN is checked on the server (`src/lib/personal-lock.ts`): a correct PIN sets a signed, httpOnly cookie for 30 minutes, and each Personal page checks it before reading any record, so nothing private reaches a locked browser. "View as" still picks the role in the browser; once each staff member has their own login, the server renders only the signed-in person's screens and notifications.

The map uses OpenStreetMap's public tiles, which is fine for development; before go-live switch to a tile provider account (their usage policy limits heavy use). GPS positions are sample data until a GPS provider is chosen.

Read state for notifications, the install card's "Not now" and the Excel export all live in the browser for now. Banks added and bank entries saved (by hand or from a statement) are kept on the device they were made on (`src/lib/bank-book.ts`) until Supabase is connected; then they become rows in the bank tables. With Supabase, notifications come from a table filled by a scheduled function (which also sends the phone push), and reminders go out through a WhatsApp Business provider and a DLT-registered SMS sender.

Accessibility and phones (F6 pass): every route was checked with axe-core at 375, 800 and 1280 px wide and for sideways scrolling on phones; all pass. Small text meets WCAG AA contrast (greys, blue and green are a shade darker than Apple's web values for this), there is a "Skip to content" link, swipe rows and wide tables can be scrolled with the keyboard, and back links and tick boxes have larger tap areas.

The frontend is complete. Next: connect Supabase.

## Connect Supabase

1. Create a Supabase project in the Mumbai region (staging first).
2. Run `supabase/migrations/20261026000000_phase1_core.sql` in the SQL editor (or `supabase db push` with the CLI), then `supabase/seed.sql`.
3. Create the owner's login in Authentication, then add their row to `profiles` with `role = 'owner'`.
4. Copy `.env.example` to `.env.local` and fill in the project URL and publishable key, plus `SESSION_SECRET`, `PERSONAL_PIN`, `PERSONAL_LOCK_SECRET` and `NEXT_PUBLIC_SITE_URL` (the app's public address, used for link previews and the sitemap).

## Where things are

- `src/app/globals.css`: design tokens from the Design plan (colours, radius, shadows, frosted bar). No dark mode anywhere.
- `src/lib/sales.ts`: sale rules (units to MT, totals, credit check, discount limits), shared with the database function.
- `src/lib/data`: every screen's data. `getToday()` there is the one place "today" comes from: the real date in India time, read at request time.
- `src/lib/limits.ts`: business limits used on several screens (low stock, cash a staff member may carry); they become owner settings later.
- `src/lib/sections.ts`: every module, its icon and colour; drives the sidebar, tab bar, search and module grid.
- `src/lib/reports.ts`: every report, worked out from the same data functions as the screens so the two never disagree.
- `src/lib/notifications.ts`: the rules that turn the day's data into notifications, and which roles see each one.
- `src/components/shell`, `src/components/ui`: app shell and the shared components.
- `supabase/migrations`: schema, row-level security and the `create_sale` / `approve_sale` functions. Sales, ledger and stock are only written through these functions so totals and limits are always checked on the server.

## Rules worth knowing

- Money moves only through `ledger_entries` and stock only through `stock_movements`; balances are sums, never edited numbers.
- Over the credit limit, above the role's discount limit, or a changed rate: the owner saves with a reason; anyone else's bill waits for owner approval and posts only when approved.
- Next.js 16 here has Cache Components on: anything that depends on the request (today's date, the signed-in user, database reads) goes inside `<Suspense>`.
- Data modules (`src/lib/data`, `reports.ts`, `notifications.ts`, `personal-lock.ts`) are marked `server-only`, so the build fails if browser code ever imports them.

## Security

- Every page is sent with security headers (`next.config.ts`): no framing by other sites, no MIME sniffing, a strict referrer policy, HSTS, and only location and camera allowed.
- Database: row-level security on every table; sales, ledger and stock are only written through checked functions. Field staff can only add cash-only parties assigned to themselves and record receipts they collected from their own parties. `npm audit` reports no known vulnerabilities in the app's packages.
- Sign-in: the session cookie is signed (HMAC) with `SESSION_SECRET`, httpOnly, same-site and secure in production; a wrong login waits 0.6 s before answering, which slows guessing.
- Before go-live: set `SESSION_SECRET`, `SKA_LOGIN_ID`, `SKA_LOGIN_PASSWORD` (until Supabase Auth replaces them), `PERSONAL_PIN` and `PERSONAL_LOCK_SECRET`; make the app layout send only the signed-in user's notifications (see the note in `src/app/(app)/layout.tsx`); switch the map to a paid tile provider.
