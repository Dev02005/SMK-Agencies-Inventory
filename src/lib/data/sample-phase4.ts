/**
 * Sample data for phase 4 screens: vehicles, documents and service log, freight chart, trips, godown transfers,
 * suspense loads and GPS positions. Town positions are approximate and only for the sample map.
 */
import { addDays, dateShifter, type SampleBook } from "./sample";
import type { FreightRate, ServiceRecord, StockTransfer, SuspenseLoad, Trip, Vehicle } from "./types";

// ── Freight chart (from Polaki) ──────────────────────────────────────────────

export const freightRates: FreightRate[] = [
  { id: "fr-polaki", place: "Polaki", distanceKm: 2, perBag: 3, perMT: 55, minimum: 300, lat: 18.395, lng: 84.105 },
  { id: "fr-narasannapeta", place: "Narasannapeta", distanceKm: 9, perBag: 5, perMT: 90, minimum: 600, lat: 18.415, lng: 84.044 },
  { id: "fr-kotabommali", place: "Kotabommali", distanceKm: 12, perBag: 6, perMT: 110, minimum: 700, lat: 18.464, lng: 84.17 },
  { id: "fr-srikurmam", place: "Srikurmam", distanceKm: 18, perBag: 7, perMT: 130, minimum: 900, lat: 18.272, lng: 84.007 },
  { id: "fr-srikakulam", place: "Srikakulam", distanceKm: 25, perBag: 8, perMT: 150, minimum: 1000, lat: 18.298, lng: 83.897 },
  { id: "fr-amadalavalasa", place: "Amadalavalasa", distanceKm: 28, perBag: 9, perMT: 165, minimum: 1100, lat: 18.41, lng: 83.902 },
  { id: "fr-etcherla", place: "Etcherla", distanceKm: 32, perBag: 10, perMT: 180, minimum: 1200, lat: 18.27, lng: 83.83 },
  { id: "fr-tekkali", place: "Tekkali", distanceKm: 38, perBag: 11, perMT: 200, minimum: 1400, lat: 18.606, lng: 84.231 },
  { id: "fr-ponduru", place: "Ponduru", distanceKm: 42, perBag: 12, perMT: 220, minimum: 1500, lat: 18.351, lng: 83.761 },
  { id: "fr-palasa", place: "Palasa", distanceKm: 65, perBag: 16, perMT: 290, minimum: 2200, lat: 18.773, lng: 84.41 },
];
const placeByName = (name?: string) => freightRates.find((f) => f.place === name);

/** Same wording the expense screens use when an expense is charged to a vehicle. */
export const vehicleLabel = (v: Vehicle) => `${v.kind === "lorry" ? "Lorry" : v.kind === "van" ? "Van" : v.kind === "car" ? "Car" : "Bike"} ${v.number}`;

/** The lorry's path so far today (Polaki → Srikurmam → towards Tekkali), for the map. */
export const routeToday: [number, number][] = [
  [18.395, 84.105],
  [18.36, 84.07],
  [18.31, 84.03],
  [18.272, 84.007],
  [18.31, 84.05],
  [18.38, 84.11],
  [18.44, 84.16],
  [18.512, 84.198],
];

/** Vehicles and their papers, service log, trips, godown transfers and suspense loads, for the same today as `book`. */
export function buildPhase4(book: SampleBook) {
  const { SAMPLE_TODAY, sales, stockMovements } = book;
  const at = dateShifter(SAMPLE_TODAY);

  // ── Vehicles ─────────────────────────────────────────────────────────────────

  const vehicles: Vehicle[] = [
    {
      id: "v-lorry",
      number: "AP 30 TB 1186",
      kind: "lorry",
      category: "own",
      model: "Ashok Leyland 2518",
      capacityMT: 25,
      driverId: "u-driver",
      odometer: 112480,
      nextServiceKm: 115000,
      documents: { insurance: at("2026-11-18"), tax: at("2026-11-30"), pollution: at("2027-01-20"), fitness: at("2027-03-15"), permit: at("2027-06-30") },
      tyresChangedOn: at("2026-03-12"),
      gps: { lat: 18.512, lng: 84.198, updatedAt: "12:52", status: "moving", speedKmh: 38, place: "Near Kotabommali, towards Tekkali" },
    },
    {
      id: "v-van",
      number: "AP 30 TA 4521",
      kind: "van",
      category: "godown",
      model: "Tata Ace Gold",
      capacityMT: 2.5,
      odometer: 48210,
      nextServiceKm: 50000,
      documents: { insurance: at("2026-10-29"), tax: at("2026-12-31"), pollution: at("2026-11-05") },
      gps: { lat: 18.395, lng: 84.105, updatedAt: "12:50", status: "stopped", speedKmh: 0, place: "Polaki godown" },
    },
    {
      id: "v-car",
      number: "AP 30 BC 7007",
      kind: "car",
      category: "own",
      model: "Maruti Ertiga",
      odometer: 32100,
      nextServiceKm: 35000,
      documents: { insurance: at("2027-04-02"), tax: "2031-04-01", pollution: at("2026-10-20") },
    },
    {
      id: "v-bike-1",
      number: "AP 30 BK 3344",
      kind: "bike",
      category: "own",
      model: "Hero Splendor+",
      driverId: "u-ramana",
      odometer: 21400,
      nextServiceKm: 22000,
      documents: { insurance: at("2027-02-11"), pollution: at("2026-12-04") },
    },
    {
      id: "v-bike-2",
      number: "AP 30 BK 5521",
      kind: "bike",
      category: "own",
      model: "Honda Shine",
      driverId: "u-venkatesh",
      odometer: 18900,
      nextServiceKm: 21000,
      documents: { insurance: at("2027-05-19"), pollution: at("2027-01-09") },
    },
    {
      id: "v-rent",
      number: "AP 39 TA 6610",
      kind: "lorry",
      category: "rented",
      model: "Tata 1612 (Ganesh Transport)",
      capacityMT: 15,
      ownerPartyId: "ganesh",
      odometer: 0,
      nextServiceKm: 0,
      documents: {},
    },
  ];

  const serviceLog: ServiceRecord[] = [
    { id: "sr-1", vehicleId: "v-lorry", date: at("2026-10-14"), kind: "brakes", odometer: 111620, cost: 6200, garage: "Sai Auto Works, Narasannapeta", notes: "Brake lining and labour" },
    { id: "sr-2", vehicleId: "v-lorry", date: at("2026-07-22"), kind: "service", odometer: 105010, cost: 14800, garage: "Ashok Leyland service, Srikakulam", notes: "10,000 km service; engine oil and filters" },
    { id: "sr-3", vehicleId: "v-lorry", date: at("2026-03-12"), kind: "tyres", odometer: 92300, cost: 86000, garage: "MRF tyre shop, Srikakulam", notes: "Six rear tyres" },
    { id: "sr-4", vehicleId: "v-van", date: at("2026-08-30"), kind: "service", odometer: 45020, cost: 4200, garage: "Tata service, Srikakulam" },
    { id: "sr-5", vehicleId: "v-van", date: at("2026-05-18"), kind: "battery", odometer: 41800, cost: 5600, garage: "Exide shop, Polaki" },
    { id: "sr-6", vehicleId: "v-car", date: at("2026-06-04"), kind: "service", odometer: 30050, cost: 6900, garage: "Maruti service, Srikakulam" },
    { id: "sr-7", vehicleId: "v-bike-1", date: at("2026-09-10"), kind: "oil", odometer: 19050, cost: 650, garage: "Local mechanic, Tekkali" },
    { id: "sr-8", vehicleId: "v-bike-2", date: at("2026-08-02"), kind: "service", odometer: 16100, cost: 1100, garage: "Honda service, Narasannapeta" },
  ];

  // ── Trips: our lorry's delivery runs, made from the FOR bills of the last two weeks ─────

  const trips: Trip[] = [];
  {
    const lorry = vehicles[0];
    let km = lorry.odometer;
    const days = [...new Set(sales.filter((s) => s.transportMode === "FOR" && s.status === "saved" && s.billDate >= addDays(SAMPLE_TODAY, -13)).map((s) => s.billDate))].sort().reverse();
    for (const day of days) {
      const stops = sales.filter((s) => s.billDate === day && s.transportMode === "FOR" && s.status === "saved");
      const farthest = Math.max(...stops.map((s) => placeByName(s.destination)?.distanceKm ?? 20));
      const distance = farthest * 2 + 10;
      const today = day === SAMPLE_TODAY;
      trips.push({
        id: `trip-${day}`,
        date: day,
        vehicleId: lorry.id,
        driverId: "u-driver",
        saleIds: stops.map((s) => s.id),
        // Today's run is still going, so it has no closing reading yet.
        startKm: today ? km - 46 : km - distance,
        endKm: today ? undefined : km,
        status: today ? "on_the_way" : "completed",
      });
      km -= today ? 46 : distance;
    }
  }

  // ── Godown transfers ─────────────────────────────────────────────────────────

  const transfers: StockTransfer[] = [
    {
      id: "tr-1",
      transferNo: 71,
      date: at("2026-10-10"),
      from: "g-polaki",
      to: "g-srikakulam",
      vehicle: "Van AP 30 TA 4521",
      lines: [{ productId: "p-deccan-opc", qty: 200 }],
      status: "received",
      receivedOn: at("2026-10-10"),
    },
    {
      id: "tr-2",
      transferNo: 72,
      date: at("2026-10-20"),
      from: "g-polaki",
      to: "g-srikakulam",
      vehicle: "Lorry AP 30 TB 1186",
      lines: [
        { productId: "p-deccan-ppc", qty: 100 },
        { productId: "p-tmt-8", qty: 1000 },
      ],
      status: "received",
      receivedOn: at("2026-10-20"),
      note: "Srikakulam was low on PPC",
    },
    {
      id: "tr-3",
      transferNo: 73,
      date: SAMPLE_TODAY,
      from: "g-polaki",
      to: "g-srikakulam",
      vehicle: "Van AP 30 TA 4521",
      lines: [{ productId: "p-deccan-opc", qty: 150 }],
      status: "in_transit",
    },
  ];

  // ── Suspense loads: sent out before the buyer is known ──────────────────────

  const assignedSale = sales.find((s) => s.partyId === "sai" && s.status === "saved" && s.billDate >= at("2026-10-22"));
  const suspenseLoads: SuspenseLoad[] = [
    { id: "sl-1", date: SAMPLE_TODAY, godownId: "g-polaki", vehicle: "Van AP 30 TA 4521", productId: "p-deccan-opc", qty: 60, note: "Tekkali route; staff to find the buyer on the way" },
    { id: "sl-2", date: addDays(SAMPLE_TODAY, -2), godownId: "g-srikakulam", vehicle: "Lorry AP 39 TA 6610 (rented)", productId: "p-deccan-opc", qty: 120, note: "Palasa site; contractor to confirm who pays" },
    {
      id: "sl-3",
      date: at("2026-10-21"),
      godownId: "g-polaki",
      vehicle: "Van AP 30 TA 4521",
      productId: "p-deccan-ppc",
      qty: 40,
      note: "Kotabommali market",
      assigned: { partyId: assignedSale?.partyId ?? "rama", saleId: assignedSale?.id, date: assignedSale?.billDate ?? at("2026-10-22") },
    },
  ];

  // Stock moves for transfers and unassigned suspense loads (assigned loads were already billed).
  let movementNo = 1;
  const move = (date: string, godownId: string, productId: string, qty: number, kind: "transfer" | "suspense", ref: string) =>
    stockMovements.push({ id: `sm-p4-${movementNo++}`, date, godownId, productId, qty, kind, ref });
  for (const t of transfers) {
    for (const l of t.lines) {
      move(t.date, t.from, l.productId, -l.qty, "transfer", `Transfer ${t.transferNo} out`);
      if (t.status === "received") move(t.receivedOn ?? t.date, t.to, l.productId, l.qty, "transfer", `Transfer ${t.transferNo} in`);
    }
  }
  for (const s of suspenseLoads.filter((x) => !x.assigned)) move(s.date, s.godownId, s.productId, -s.qty, "suspense", "Suspense load");

  return { vehicles, serviceLog, trips, transfers, suspenseLoads };
}
