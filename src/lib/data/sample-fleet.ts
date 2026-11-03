import { withLocalFleet, type FleetEntry } from "./local-data";
import type { Vehicle } from "./types";

/**
 * Which vehicles there are: the sample fleet, or the real one from local-data/vehicles.json. Papers, service and
 * GPS are added with the dated sample data (sample-phase4); bills, expenses and transfers name vehicles through
 * fleetLabel, so they follow whichever vehicle is in place.
 */
export const fleet: FleetEntry[] = withLocalFleet([
  { id: "v-lorry", number: "AP 30 TB 1186", kind: "lorry", category: "own", model: "Ashok Leyland 2518" },
  { id: "v-van", number: "AP 30 TA 4521", kind: "van", category: "godown", model: "Tata Ace Gold" },
  { id: "v-car", number: "AP 30 BC 7007", kind: "car", category: "own", model: "Maruti Ertiga" },
  { id: "v-bike-1", number: "AP 30 BK 3344", kind: "bike", category: "own", model: "Hero Splendor+" },
  { id: "v-bike-2", number: "AP 30 BK 5521", kind: "bike", category: "own", model: "Honda Shine" },
  { id: "v-rent", number: "AP 39 TA 6610", kind: "lorry", category: "rented", model: "Tata 1612 (Ganesh Transport)" },
]);

const kindNames: Record<Vehicle["kind"], string> = { lorry: "Lorry", van: "Van", car: "Car", bike: "Bike" };

/** "Lorry AP 30 TB 1186". */
export const vehicleLabel = (v: Pick<Vehicle, "kind" | "number">) => `${kindNames[v.kind]} ${v.number}`;

/** The label of the vehicle with this id ("v-lorry", "v-van"…), whichever vehicle is in its place. */
export function fleetLabel(id: string) {
  const v = fleet.find((f) => f.id === id);
  return v ? vehicleLabel(v) : "";
}
