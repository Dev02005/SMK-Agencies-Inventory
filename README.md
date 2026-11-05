# SKA app

The private business and personal app for Sri Kameswari Agencies (cement and steel, Polaki). The project plan and design plan live in the shared Claude Doc; this folder is the code.

Stack: Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage) · Lucide icons. Light theme only.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000 on any phone or computer. The app opens on the sign-in page. Everyone, the owner too, signs in with the mobile number (or email) on the staff list (`local-data/staff.json`; the owner is its `owner` entry). The mobile number can be typed with or without +91. The second step is a 6-digit sign-in code, entered in six boxes; everyone's code is 000000 until they set their own from Settings › Account (6 digits, not 000000), after which 000000 no longer works for them. Each person sees and opens only their own role's screens (checked before any page renders, `src/lib/access.ts`). Codes people set are kept hashed in `local-data/login-codes.json`, so they last across restarts; deleting someone's line there puts them back on 000000. With Supabase, Supabase Auth stores them. Everyone is signed out at 12 midnight India time.

Without Supabase keys the app runs on the sample data in `src/lib/data` and shows a "Sample data" chip. The sample records follow the real calendar: they are rebuilt each day around today's date in India, so "today" on every screen is the real today.

## What is built (frontend phases F0–F6)

Every screen runs on sample data from `src/lib/data` and shows a "Sample data" chip; forms check their input and show a "not stored" message instead of saving.

| Area | Screens |
| --- | --- |
| Shell | Sidebar (desktop), icon rail (tablet), tab bar + quick-add sheet (phone), search (Ctrl K), profile menu with Account and Sign out |
| Sign-in | `/login` first, in two steps: the mobile number (or email), then the person's saved name is shown and they enter their 6-digit code (`src/lib/login.ts`, `src/components/ui/code-input.tsx`; name look-ups are limited to 20 per 10 minutes per address): every other page needs a session (`src/proxy.ts` checks it before the page renders, the app layout checks it again). The session is a signed, httpOnly cookie that ends at 12 midnight India time; an open app signs itself out at midnight (`midnight-sign-out.tsx`) |
| Account | `/settings/account` (Settings › Account): who is signed in, login ID, when they signed in, a countdown to the midnight sign-out, change sign-in code, sign out |
| Home | `/` dashboard with today's real date and a live clock: today's sales, cash with staff, collected / outstanding / overdue, approvals, dues |
| Sales | `/sales` list with filters, `/sales/new`, `/sales/[id]` bill, `/sales/[id]/print` A4 bill, `/sales/lorries` company lorries sold straight off the truck: each is sold as a whole, and once sold out the owner updates it with the day and what it sold for (Home and Notifications remind them when that is late). Lorry purchases are under `/purchases/lorries` (+ `/new`: firm, company, invoice no. and date, lorry, driver, sells-out days, items, total invoice value and freight) |
| Quotations | `/quotations`, `/quotations/new`, `/quotations/[id]` in the SKA paper format, printable |
| Purchases | `/purchases`, `/purchases/new`, `/purchases/[id]` |
| Parties | `/parties` with balances, `/parties/[id]` ledger (detailed / summary) and ageing, `/parties/new` |
| Money | `/money` receipts and payments, `/money/receipts/new`, `/money/payments/new` |
| Stock | `/stock` godown balances and movements. Stock comes in only through a purchase: saving a purchase puts its items into the purchase's godown (there is no separate inward step) |
| Settings | `/settings` for everyone: Account and Install app; the owner and office also get firm details (each firm's details, Add firm and the Primary firm tick: sales are billed from the primary firm, New purchase asks which firm), godowns with their in-charges, products (no rates), users & roles |
| Dates and downloads | Every list has the same date filter (All dates, Today, Last 7 days, This month, Pick a day, From – to), kept in the page address (`src/lib/date-filter.ts`), and **Download** and **Share** buttons: Excel (.xlsx), PDF (A4 pages) or a JPG picture of what is on screen after the filters, plus Print. Share opens the phone's or computer's share sheet (WhatsApp, mail…); where a browser can't share files it saves the file and opens WhatsApp or email to attach it, or copies the picture to paste. Files are made in the browser (`src/lib/export/`); card pages carry a hidden table for this (`src/components/ui/export-table.tsx`) |
| Staff cash | `/money/cash` everyone's cash today, `/money/cash/[holder]` day-by-day cash book with counts, `/money/cash/handover/new` |
| Expenses | `/money/expenses` by head with this month's split, `/money/expenses/new` with fixed heads, paid-from and vehicle/staff/godown tag |
| Advances | `/money/advances` fixed-price cement commitments and plain advances, `/money/advances/[id]` bags supplied and left, `/money/advances/new` |
| Ageing & reminders | `/money/ageing` 0–7 / 8–30 / 31–60 / 61–90 / 90+ grid, reminder selection and history |
| Bad debts, banks | `/money/bad-debts` write-offs (owner only); `/money/banks` with **Add bank** (`/money/banks/add`: the IFSC fills in the bank); `/money/banks/[id]` with every transaction and a running balance, **Add entry** and **Import statement**; `/money/banks/new` |
| Bank statement import | On a bank's page, choose or drop the statement PDF (`src/lib/statement-pdf.ts` reads it in the browser with pdf.js; nothing is uploaded). `src/lib/statement-parser.ts` finds the transactions table from its column headings, so SBI, HDFC, Union Bank, APGB, KVB and most other Indian banks read the same way, and checks every row against the statement's running balance. The preview shows the bank, account and period, warns if the account number doesn't match, leaves rows already in the account unticked, asks for the password of locked PDFs, and saves the ticked rows. Tested on real SBI, HDFC, Union Bank, APGB and KVB statements: 74 of 74 rows read and balanced |
| Personal | `/personal` behind a 4-digit PIN the owner chooses the first time (kept hashed in the records; changed in Settings › Account), owner only: overview, chits, rents, insurance, personal banks, notes, documents |
| Home by role | `/` shows a different screen per role: owner/office dashboard, field staff (cash, targets, visits, who to collect from), godown (bills to load, lorries arriving, stock, orders), driver (today's deliveries, cash, renewals) |
| People | `/people` staff, `/people/[id]`, `/people/new`, `/people/mapping` (sub-dealers per staff), `/people/tours`, `/people/targets`, `/people/salary` (salary sheet, loans and advances) |
| Orders | `/orders` pending / new / confirmed / dispatched, `/orders/[id]` ordered vs sent with bills, `/orders/new` |
| Stock movement | `/stock/transfers` (+ `/new`) between godowns with in-transit status, `/stock/lorries` what is on lorries still selling off the truck, `/stock/suspense` loads sent before the buyer is known |
| Vehicles | `/fleet` papers due and service due per vehicle, `/fleet/[id]` papers, health, service log, running cost; `/fleet/trips`; `/fleet/map` (Leaflet + OpenStreetMap); `/fleet/drivers` driver cash ledger and hired lorries |
| Reports | `/reports` hub and `/reports/[report]`: daybook, sales summary (by party, product, staff or day), discounts, outstanding and ageing, collections, expenses, stock summary, vehicle costs, activity log. Each has the date filter and grouping options, and Download: **Excel** (a real .xlsx, numbers stay numbers), **PDF**, **JPG**, Share and **Print** (A4 with the firm header; wide reports print landscape) |
| Notifications | Bell with unread count in the top bar and `/notifications`: approvals, payment reminders due, who to collect from, vehicle papers and service, low stock, new and pending orders, lorries arriving, transfers, suspense loads, cash above the limit, deliveries, personal dues. Each role sees its own; field staff and drivers only theirs |
| Reminder messages | `/settings/reminders`: when reminders go (first after, repeat, stop after, time, skip Sundays, SMS if WhatsApp fails) and the message templates with fill-in fields, SMS length count and a preview with real parties. Includes a Telugu draft for the owner to check |
| Install | Installs like an app on Android, iPhone, iPad, Windows, Mac and ChromeOS: PNG icons (192, 512, maskable, Apple), manifest with shortcuts (new bill, receipt, notifications). The install card offers one-tap install in Chrome, Edge and Samsung Internet, shows Share → Add to Home Screen on iPhone/iPad, File → Add to Dock in Safari on a Mac, and the browser menu in Firefox on Android; "Install app" is also in the profile menu |
| Offline | A service worker (`public/sw.js`, production builds only) keeps the app's own files so the installed app opens fast and shows `/offline` with no signal; pages and figures are never stored on the device. Next.js's offline mode shows a banner and retries page loads and saves when the connection returns |
| Dropdowns and pickers | Every dropdown, date, time and tick box is the app's own, so it looks the same on every device: `select.tsx`, `date-picker.tsx` (a calendar with month and year arrows, Today and Clear), `time-select.tsx` and `checkbox.tsx` in `src/components/ui`. Dropdowns and calendars open as a panel under the field on tablets and computers and as a bottom sheet with large rows on phones (`popover.tsx`), with full keyboard and screen-reader support |
| Map | `/fleet/map` on OpenStreetMap, dressed in the app's look: softer map colours, round zoom buttons, card-style popups and pill-shaped vehicle markers coloured by status (`.ska-map` in `globals.css`) |
| SEO and sharing | The sign-in page is indexable with a description, canonical address, business details for Google (schema.org) and a branded preview image for WhatsApp and social links; `robots.txt` and `sitemap.xml` list only it. Every page behind sign-in is marked noindex, because it holds business records |

The Personal PIN is checked on the server (`src/lib/personal-lock.ts`): a correct PIN sets a signed, httpOnly cookie for 30 minutes, and each Personal page checks it before reading any record, so nothing private reaches a locked browser. Each person sees only their own role's screens.

The map uses OpenStreetMap's public tiles, which is fine for development; before go-live switch to a tile provider account (their usage policy limits heavy use). GPS positions are sample data until a GPS provider is chosen.

Read state for notifications, the install card's "Not now" and the Excel export all live in the browser for now. Banks added and bank entries saved (by hand or from a statement) are kept on the device they were made on (`src/lib/bank-book.ts`) until Supabase is connected; then they become rows in the bank tables. With Supabase, notifications come from a table filled by a scheduled function (which also sends the phone push), and reminders go out through a WhatsApp Business provider and a DLT-registered SMS sender.

Accessibility and phones (F6 pass): every route was checked with axe-core at 375, 800 and 1280 px wide and for sideways scrolling on phones; all pass. Small text meets WCAG AA contrast (greys, blue and green are a shade darker than Apple's web values for this), there is a "Skip to content" link, swipe rows and wide tables can be scrolled with the keyboard, and back links and tick boxes have larger tap areas.

The frontend is complete. Next: connect Supabase.

## The firm's own records

The firm's real records are never in the code: `local-data/` is in `.gitignore`, so it never goes to GitHub (the repository is public). Each list (`staff.json`, `godowns.json`…) replaces the matching sample records when it is there; without it the app runs on sample data (`src/lib/data/local-data.ts` and `firms.ts` read them through `store.ts`). They are kept in one of two places:

- **On this computer** (no `SKA_DATA_SECRET`): JSON files in `local-data/`.
- **Online** (`SKA_DATA_SECRET` set): one row per list in the Supabase table `ska_records`, so the site on Vercel has them too. The table is locked: the publishable key alone can't read or write it, only its two functions can, and only with `SKA_DATA_SECRET`. Each request fetches what changed since that server last looked, and a save that meets someone else's save of the same list is made again on the newer one, so nothing is lost when two people save at once.

| File | Holds | Changed from |
|---|---|---|
| `firms.json` | Each firm's name, GSTIN, phone, address and which one is primary (sales are billed only from the primary firm; purchases ask which firm) | Settings › Firm details (saved straight away) |
| `staff.json` | The owner's name and mobile, and each staff member's name, designation, role (`office`, `field`, `godown` or `driver`), mobile and the godowns they look after | By hand for now; restart the app after editing |
| `godowns.json` | Our own godowns and the companies' godowns, own ones first | By hand for now; restart the app |
| `vehicles.json` | Our vehicles (`own` lorries and vans are offered for FOR deliveries) | By hand for now; restart the app |
| `customers.json` | Customers and sub-dealers added in the app | New sale › Party › New customer (saved straight away) |
| `suppliers.json` | The companies we buy from and the brand(s) each sells (a purchase offers only that company's products) | By hand for now; restart the app |
| `products.json` | Each company's cement types (and any steel items). No rates: the owner prices each bill | Settings › Products (new products save straight away) |
| `banks.json` | Each firm's business bank accounts: bank, account number, IFSC, branch, opening balance | By hand for now; restart the app |
| `lorries.json` | Company lorries bought to sell off the truck, and what each sold for (items sold with rates, charges, tick boxes, sold out) | Purchases › Lorry › New lorry purchase; Sales › Lorry sales › Update sale (`/sales/lorries/[id]`) |
| `notes.json` | Each person's quick notes from the floating notes ball | The ball on every screen (saved straight away) |
| `destinations.json` | Villages and towns we deliver to | New sale › Destination › Add destination |
| `chits.json` | The owner's chits, with each instalment and the lifting recorded | Personal › Chits › Add chit, Record instalment, Mark lifted |
| `rents.json` | Rent received and rent paid, with each month recorded | Personal › Rents › Add rent, Mark rent received / paid |
| `rent-drivers.json` | Drivers of rented vehicles | New sale › Rent › Driver › Add driver |
| `login-codes.json` | 6-digit sign-in codes people set for themselves, as salted hashes | Settings › Account › Change sign-in code |

Who sees what: a godown's in-charges (set in `staff.json`) see only the godowns they look after, with only those godowns' stock, purchases, sales and transfers; the owner and staff who look after no godown see them all (`getMyGodowns` in `src/lib/data`). People, Vehicles, Users & roles, and the People and Vehicles reports are the owner's alone; the app's frame sends the staff list and every role's notices to the owner only (others get their own). Orders carry the godown they load from, so in-charges see only theirs. Lorry purchases and sales are the owner's alone, checked on the server (`src/components/auth/owner-only.tsx`, and `getLorries` gives nobody else any).

Original or sample: records read from `local-data/` carry `original: true`. List pages show **Original data**, **Sample data** or **Original + sample** (`DataOrigin`, `OriginChip`), and in a mixed list each sample record has a small **Sample** tag (`SampleTag`). Sales, money and stock are all still sample data.

`replaces` in `staff.json` and `vehicles.json` lets a real person or vehicle take over a sample one's records. A host with a read-only disk (Vercel) needs the records online.

```json
{ "staff": [{ "name": "Example", "designation": "Wholesale manager", "role": "field", "mobile": "9000000000", "godowns": ["g-polaki"] }] }
```

## Put the records online (Supabase)

1. In Supabase › SQL Editor, run `supabase/migrations/20261103000000_records.sql`, then set the data key's SHA-256 as its first lines say.
2. In `.env.local` set `SKA_DATA_SECRET` (that key) beside the Supabase URL and publishable key. It is the only key: the sign-in and Personal-lock keys are worked out from it (`src/lib/keys.ts`), and passwords and the Personal PIN are kept, hashed, in the records.
3. `npm run records:upload` copies `local-data/*.json` up (records already online are left alone). From then on the app on this computer uses the online records too; `npm run records:download` saves a backup copy back into `local-data/`.
4. On Vercel › Settings › Environment Variables, add the same three (and `NEXT_PUBLIC_SITE_URL`, the site's address), then redeploy. `vercel.json` runs the app in Paris (`cdg1`), next to the Supabase project (eu-west-3), so each page's fetch of the records takes a few milliseconds; change both together if the project moves.

## Connect Supabase (the full database)

1. Create a Supabase project in the Mumbai region (staging first).
2. Run `supabase/migrations/20261026000000_phase1_core.sql` in the SQL editor (or `supabase db push` with the CLI), then `supabase/seed.sql`.
3. Create the owner's login in Authentication, then add their row to `profiles` with `role = 'owner'`.
4. Copy `.env.example` to `.env.local` and fill in the project URL and publishable key, plus `SKA_DATA_SECRET` and `NEXT_PUBLIC_SITE_URL` (the app's public address, used for link previews and the sitemap).
5. Add `@supabase/ssr` and `@supabase/supabase-js` (`npm install`), create the browser and server clients in `src/lib/supabase`, and switch the functions in `src/lib/data` from the sample and local-data records to queries. Then set `usesSampleData` to false.

## Where things are

- `src/app/globals.css`: design tokens from the Design plan (colours, radius, shadows, frosted bar). No dark mode anywhere.
- `src/lib/sales.ts`: sale rules (units to MT, totals, credit check, discount limits), shared with the database function.
- `src/lib/data`: every screen's data. `getToday()` there is the one place "today" comes from: the real date in India time, read at request time.
- `src/lib/limits.ts`: business limits used on several screens (low stock, cash a staff member may carry); they become owner settings later.
- `src/lib/sections.ts`: every module, its icon and colour; drives the sidebar, tab bar, search and module grid.
- `src/lib/reports.ts`: every report, worked out from the same data functions as the screens so the two never disagree.
- `src/lib/notifications.ts`: the rules that turn the day's data into notifications, and which roles see each one.
- `src/lib/date-filter.ts` (with `page-dates.ts` for server pages): the date filter every list shares, kept in the page address.
- `src/lib/export`: Download. `table.ts` reads the tables on screen, `excel.ts`, `picture.ts` (JPG and A4 pages) and `pdf.ts` make the files, `save.ts` downloads or shares them.
- `src/components/shell`: the app shell (sidebar, top bar, tab bar, install card, midnight sign-out).
- `src/components/ui`: the shared building blocks: cards and figures (`blocks.tsx`), `data-table.tsx`, the pickers above, `data-tools.tsx` (date filter and Download over a list), `export-menu.tsx`, `export-table.tsx` (a hidden table for card pages).
- `supabase/migrations`: schema, row-level security and the `create_sale` / `approve_sale` functions. Sales, ledger and stock are only written through these functions so totals and limits are always checked on the server.

## Rules worth knowing

- Money moves only through `ledger_entries` and stock only through `stock_movements`; balances are sums, never edited numbers.
- Products have no fixed rates. Staff (godown in-charges and others) save a sale with the items and quantities only; it waits as a sale request with no bill no. The owner opens it, gives it the bill no. (the next in the series is filled in), enters the rates, discount and charges, and approves it. Only then does it post.
- Over the credit limit or above the discount limit on the owner's own bill: the owner saves with a reason.
- Next.js 16 here has Cache Components on: anything that depends on the request (today's date, the signed-in user, database reads) goes inside `<Suspense>`.
- Data modules (`src/lib/data`, `reports.ts`, `notifications.ts`, `personal-lock.ts`) are marked `server-only`, so the build fails if browser code ever imports them.

## Security

- Every page is sent with security headers (`next.config.ts`): no framing by other sites, no MIME sniffing, a strict referrer policy, HSTS, and only location and camera allowed.
- Database: row-level security on every table; sales, ledger and stock are only written through checked functions. Field staff can only add cash-only parties assigned to themselves and record receipts they collected from their own parties. `npm audit` reports no known vulnerabilities in the app's packages.
- Sign-in: the session cookie is signed (HMAC) with a key worked out from `SKA_DATA_SECRET`, httpOnly, same-site and secure in production; a wrong login waits 0.6 s before answering, which slows guessing.
- Keys: the server has one, `SKA_DATA_SECRET`; nothing else secret is set on Vercel. Passwords and the Personal PIN are salted scrypt hashes in the records, never the secrets themselves.
- Before go-live: switch the map to a paid tile provider.
- Records online: the `ska_records` table has row-level security and no grants; only `ska_records_since` and `ska_save_records` open it, and only with `SKA_DATA_SECRET`, which stays on the server (the database keeps only its SHA-256).
