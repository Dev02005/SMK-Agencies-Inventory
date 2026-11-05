# Decisions

## [2026-11-03] Firm's records as JSON lists in one Supabase table
- Chose: one row per list in `ska_records` (staff.json, vehicles.json…), read and saved through `src/lib/data/store.ts`, with `local-data/` as the offline copy.
- Over: full relational tables for every list right away.
- Why: the lists were already JSON files on the owner's computer; this put them online for Vercel with no migration of each screen, and saves merge safely when two people save at once.

## [2026-11-05] Sign in with a 6-digit code, default 000000
- Chose: mobile number, then a 6-digit code entered in six boxes; everyone starts on 000000 and changes it in Settings › Account. Codes saved hashed in `login-codes.json`.
- Over: free-text passwords (old `passwords.json`, no longer read) and the mobile number as default password.
- Why: easier on phones for staff; the owner asked for a single default code.

## [2026-11-05] Own name and photo in profiles.json, not staff.json
- Chose: name changes and photos saved by person id in `profiles.json`; photos are small square JPEGs served from `/profile-photo/{id}` to signed-in users.
- Over: renaming people in `staff.json`.
- Why: a staff member's id comes from their name there, and every sale, note and code is filed under that id.

## [2026-11-05] Drivers don't sign in; a vehicle carries its driver
- Chose: driver logins and pages removed; the driver is saved on the vehicle (`driver` in vehicles.json for own vehicles, `driverName`/`driverMobile` for rented ones). Sales, Vehicles and People all read it from there.
- Over: driver accounts, and drivers linked to vehicles in several places.
- Why: drivers don't use the app, and two sources had drifted apart.

## [2026-11-05] One bill series for godown and lorry bills, numbered on save
- Chose: the next number is the latest saved bill + 1 (starting at 1); lorry bills get their numbers inside the save, so two people never get the same one. Nobody types bill numbers.
- Over: typed bill numbers and separate series.
- Why: the owner wants 1, 2, 3… across godown and lorry bills.

## [2026-11-05] Lorry sales recorded as bills
- Chose: each sale from a company lorry is a bill (date, number, buyer, bags, amount); the total invoice value defaults to the bills added up but can be typed.
- Over: one sold quantity per item, then sales by place.
- Why: the owner sells a lorry over several bills and needs each one's price.

## [2026-11-05] Vehicle costs and freight stay off the bill
- Chose: named "vehicle other costs" and freight per bag (rented vehicles) recorded with the sale, never added to the customer's bill. No freight chart.
- Over: an "Other" charge added to the bill and a freight rate chart by village.
- Why: these are the firm's own costs; the owner sets freight per bag on each sale.

## [2026-11-05] Removed attendance, View as and the freight chart
- Chose: remove them completely; salary is now gross minus loan instalments.
- Over: keeping them unused.
- Why: the owner doesn't use them.

## [2026-11-05] Sample data only as tagged demo records
- Chose: sample parties, vehicles and suppliers removed; a week of sample godown bills (billed to Cash customer) and 6 sample Deccan purchases kept with `demo: true` and a "Sample" tag, excluded from every ledger, balance and ageing.
- Over: no sample data at all, or sample customers back in Parties.
- Why: the owner wants to try Sales and Purchases while keeping real balances clean.

## [2026-11-05] Personal bank accounts in banks.json
- Chose: Personal › Banks saves accounts in the same `banks.json` record with `"scope": "personal"`.
- Over: device-only storage (how Money › Add bank still works).
- Why: personal accounts must survive across devices and stay apart from business accounts.

## [2026-11-05] Official SKA logo & native 2-step login flow
- Chose: Replaced the placeholder icon with the official multi-color Sri Kameswari Agencies logo (`/logo.png`) across the entire app (login page, sidebar, mobile top bar, install prompts, and app icons).
- Chose: Maintained the two-step verification flow styled in the modern card aesthetic:
  - Step 1: User enters their mobile number / username; the system searches and verifies the staff profile.
  - Step 2: System welcomes the user with their name, initials avatar, and designation badge, then displays the 6-digit PIN input with the eye reveal toggle and auto-submit.
  - Options: "Not you? Change number" back button, "Remember me" checkbox, and "Forgot code?" guidance.
  - Three service badges: Timely Delivery, Quality Products, Strong Relations.
- Over: single-screen simultaneous inputs or AI backdrop clones.
- Why: combines the desired visual design and real brand logo with the security and personalization of greeting staff by name before asking for their code.

## [2026-11-05] Invoice number in lorry purchases
- Chose: Added an "Invoice number" field to `LorryPurchaseForm` and passed it through `saveLorryPurchase` / `checkLorry` to store on `lorry.invoiceNo`.
- Chose: Displayed the company invoice number in `LorryMeta`, `LorryCost`, and in the lorry purchases export table.
- Why: allows tracking the supplier's actual bill/invoice reference for lorries bought to sell straight off the truck.

## [2026-11-05] Custom product items in Add Product
- Chose: Support adding custom products in addition to Cement (bags) and Steel (kg) via a 3-way Segmented switcher (`Cement (bags)`, `Steel (kg)`, `Custom item`).
- Chose: For custom items, provide customizable Category / Group (with one-click quick presets: Paints, Pipes, Hardware, Bricks, Chemicals, Aggregates, Other) and Unit of Measure (Pieces, Boxes, Bundles, Bags, Kg, Meters, Litres, or custom typed unit).
- Chose: Preserved strict MT calculations for cement (bags / 20) and steel (kg / 1000) while making MT optional (returns 0 and hides `0 MT` chips) for items sold by piece, box, litre, bundle, etc.
- Chose: Added category filter buttons and category badges in `ProductList` to easily browse and manage items by category.
- Over: Hardcoding a fixed list of categories or only allowing cement and steel.
- Why: Hardware agencies and building material suppliers regularly stock and sell sundry items (pipes, paint buckets, binding wire, tools, bricks, chemicals) alongside core cement and steel.

## [2026-11-05] Removal of sample purchases and sales
- Chose: Cleared all deterministic sample purchases and sample sales from `src/lib/data/sample.ts`.
- Chose: Godown sales, lorry sales, and godown purchases now start completely empty (0 sample records), preserving genuine business records entered by staff/owner.
- Why: User requested a clean slate without mock/demo transaction records cluttering sales and purchase registers.
