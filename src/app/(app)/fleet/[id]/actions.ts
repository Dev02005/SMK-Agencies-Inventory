"use server";

import { getCurrentUser, updateVehicleDetails } from "@/lib/data";
import { mobileOf } from "@/lib/mobile";

export type VehicleInput = {
  number: string;
  group: "commercial" | "rented" | "personal";
  kind: "lorry" | "van" | "car" | "bike";
  model: string;
  driverName: string;
  driverMobile: string;
  driver: string;
};
export type VehicleResult = { ok: true; id: string } | { ok: false; problem: string };

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");

/** "ap39wc2468" or "AP 39 WC 2468" → "AP 39 WC 2468"; null when it doesn't look like a number plate. */
function plate(input: string) {
  const flat = input.replace(/[\s-]/g, "").toUpperCase();
  const m = /^([A-Z]{2})(\d{1,2})([A-Z]{0,3})(\d{1,4})$/.exec(flat);
  return m ? [m[1], m[2], m[3], m[4].padStart(4, "0")].filter(Boolean).join(" ") : null;
}

/** The owner changes one of the firm's own vehicles: Vehicles › the vehicle › Edit. */
export async function updateVehicle(id: string, input: VehicleInput): Promise<VehicleResult> {
  if ((await getCurrentUser()).role !== "owner") return { ok: false, problem: "Only the owner can edit vehicles." };
  const number = plate(text(input?.number, 20));
  if (!number) return { ok: false, problem: "Enter the vehicle number, like AP 39 WC 2468." };
  const group = input.group;
  const kind = input.kind;
  const kindsFor = { commercial: ["lorry", "van"], rented: ["lorry", "van"], personal: ["car", "bike"] } as const;
  if (!(group in kindsFor) || !(kindsFor[group] as readonly string[]).includes(kind)) return { ok: false, problem: "Choose the type of vehicle." };
  const model = text(input.model, 60);
  const driverName = text(input.driverName, 40);
  const driverMobile = mobileOf(text(input.driverMobile, 20));
  if (group === "rented" && driverMobile && driverMobile.length !== 10) return { ok: false, problem: "Enter the driver's 10-digit mobile number, or leave it empty." };
  return updateVehicleDetails(String(id), {
    number,
    kind,
    category: group === "rented" ? "rented" : "own",
    model,
    driverName: group === "rented" ? driverName || undefined : undefined,
    driverMobile: group === "rented" ? driverMobile || undefined : undefined,
    driver: group === "commercial" ? text(input.driver, 80) || undefined : undefined,
  });
}
