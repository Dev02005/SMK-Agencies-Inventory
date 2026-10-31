import { Bike, Car, Truck, Van } from "lucide-react";
import { Chip } from "@/components/ui/chip";
import type { Vehicle, VehicleKind } from "@/lib/data/types";

export const kindIcon: Record<VehicleKind, typeof Truck> = { lorry: Truck, van: Van, car: Car, bike: Bike };

export const categoryLabel: Record<Vehicle["category"], string> = { own: "Own", godown: "Godown", rented: "Rented" };

/** Renewal status for one document: overdue, due soon (30 days) or fine. */
export function DueChip({ label, daysLeft }: { label?: string; daysLeft: number }) {
  const prefix = label ? `${label} ` : "";
  if (daysLeft < 0) return <Chip tone="danger">{prefix}expired {-daysLeft} days ago</Chip>;
  if (daysLeft <= 30) return <Chip tone="warning">{prefix}in {daysLeft} days</Chip>;
  return <Chip>{prefix}OK</Chip>;
}

export function GpsChip({ gps }: { gps?: Vehicle["gps"] }) {
  if (!gps) return <Chip>No GPS</Chip>;
  if (gps.status === "moving") return <Chip tone="good">Moving · {gps.speedKmh} km/h</Chip>;
  if (gps.status === "stopped") return <Chip tone="neutral">Stopped · {gps.updatedAt}</Chip>;
  return <Chip tone="danger">Offline</Chip>;
}
