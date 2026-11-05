# Progress Log

## Current status
The app runs in daily use with the firm's real lists (staff, suppliers, godowns, products, banks, vehicles, customers, lorries, purchases, and sales). Lorry sales, godown sales, and godown purchases are fully real with persistent local storage and live godown stock movements.

## Done
- [2026-10-31] Business app frontend on sample data (Next.js 16).
- [2026-11-01] Sign-in first, midnight sign-out, Account page; lorry sales, two firms, date filters, downloads and Share.
- [2026-11-03] Staff sign-in by phone, godown-only access, lorry purchases and sale updates, add and delete everywhere.
- [2026-11-03] Firm's records kept online in Supabase (`ska_records`) so the Vercel site has them; app runs in Paris next to the database.
- [2026-11-05] Sign-in with a 6-digit code (default 000000); Settings › Account changes the code; edit own name and profile photo.
- [2026-11-05] Removed: View as, attendance, freight chart, driver logins and driver pages, and the sample vehicle, supplier and party data.
- [2026-11-05] Lorry sales recorded as bills (date, number from the shared series, buyer, bags, amount), total invoice value, progress bars, Selling / Sold out tabs, missing details flagged on Home.
- [2026-11-05] New sale: only stock at the chosen godown; cash customer name and phone; named vehicle costs kept off the bill; freight per bag for rented vehicles; no Transport or paper memo.
- [2026-11-05] Owner edits any staff member (name, mobile, designation, driver's vehicle) and any vehicle (number, type, model, driver); vehicles grouped commercial, rented, personal; rented Boleros with their drivers.
- [2026-11-05] New supplier from the purchase page; Personal › Banks Add bank (saved as scope personal); Insurance Add button; sales print and download by day.
- [2026-11-05] A few sample godown bills (last 7 days) and 6 sample Deccan purchases kept as demo records, tagged Sample, out of every ledger.
- [2026-11-05] Integrated official Sri Kameswari Agencies logo across login, sidebar, mobile top bar, install prompt, and app icons; updated sign-in to a 2-step verification flow (enters mobile number -> searches & greets staff by name and designation -> prompts for 6-digit PIN with 6 boxes & eye toggle); removed the dealership credential and GSTIN footer text from the login page.
- [2026-11-05] Added "Invoice number" to New Lorry Purchase (`lorry-purchase-form.tsx`, `actions.ts`, and displayed in `LorryMeta`, `LorryCost`, and export table).
- [2026-11-05] Expanded Add Product to support custom product items beyond cement (bags) and steel (kg):
  - Segmented option for "Custom item" with category group selection (quick picks: Paints, Pipes & Fittings, Hardware, Bricks & Blocks, Chemicals, Aggregates, or custom typed category).
  - Flexible units of measurement (Pieces/Nos, Boxes, Bundles, Bags, Kg, Meters, Litres, or custom units).
  - Updated validation in `local-data.ts` (`isProduct`), `Product` type in `types.ts`, `addProduct` in `data/index.ts`, and server action `createProduct`.
  - Added dynamic category filtering and badges to `ProductList` and updated `ExportTable` on `/settings/products`.
  - Ensured compatibility across sales lines, stock balances, reports, and product picker dropdowns.
- [2026-11-05] Resolved export and prop errors across purchase and quotation forms:
  - Added missing `filledLines` export in `components/forms/item-lines.tsx` used by lorry purchases, godown purchases, and orders.
  - Added `allowNew` and `onCreated` support with inline custom product creator in `ProductPicker`.
  - Cleared unused imports/variables and confirmed 0 TypeScript errors and 0 ESLint warnings.
- [2026-11-05] Removed all sample purchases and sample sales per user request:
  - Cleared deterministic sample purchases and sample lorry purchase in `src/lib/data/sample.ts`.
  - Cleared past-day and today sample bills in `src/lib/data/sample.ts`.
  - Godown sales, lorry sales, and purchases now start completely clean (empty) until real entries are created.
- [2026-11-06] Implemented real persistence and live inventory integration for Godown Purchases and Godown Sales:
  - Added real local data persistence for purchases (`local-data/purchases.json`), sales (`local-data/sales.json`), and stock movements (`local-data/stock-movements.json`).
  - Implemented server actions `createPurchaseAction` (`src/app/(app)/purchases/actions.ts`) and `createSaleAction` (`src/app/(app)/sales/actions.ts`) with Next.js path cache revalidation.
  - Connected `PurchaseForm` (`/purchases/new`) to save purchases, record inward stock movements for the destination godown, and navigate to `/purchases`.
  - Connected `NewSaleForm` (`/sales/new`) to save bills in the shared numbering series, record negative stock movements for inventory deduction, and navigate to `/sales`.
  - Verified full visibility in Godown Purchases list (`/purchases`), Godown Sales list (`/sales`), Party ledgers, and Godown stock balances (`/stock`).
- [2026-11-06] Redesigned Product Management to remove standard cement assumption and support full custom items with pictures:
  - Removed standard cement assumption and default segmented tabs; added an interactive "+ Add item" button that opens an intuitive product creator.
  - Added category selector supporting existing categories (Cement, Steel, Paints, Hardware, Bricks & Blocks, Pipes, Electricals...) with "+ Add new category" to type any custom category.
  - Added full measurement metrics (kilos `kg`, bars / rods `bar`, bags `bag`, metric tonnes `mt`, pieces `piece`, bundles `bundle`, boxes `box`, metres `metre`, square feet `sqft`, litres `litre`, quintals `qtl`, trips `load`, and custom unit).
  - Added optional drag-and-drop / file upload picture box with browser canvas compression (max 320x320 JPEG) and photo thumbnail display in the product list.
  - Verified 0 TypeScript errors, 0 ESLint warnings, and successful Next.js build.

## In progress
- Nothing open. Last session ended after the demo data commit and the AI context kit.

## Blockers / open questions
- Godown sales and godown purchases are not saved for real yet, so godown bills don't take numbers in the shared bill series and cash customer details, vehicle costs and freight aren't stored.
- Should a selling lorry show on a day it sold nothing? (Lorry sales now lists only lorries bought or billed in the chosen dates.)
- "Unloading charges" counts as missing until ticked; if some lorries genuinely have none, the rule needs changing.
- Every staff member's code is 000000 until they change it: anyone with a staff mobile number can sign in.
- `src/lib/.trashed-1796402500-sections.ts` is an old stray backup copy; kept out of git, safe to delete.
