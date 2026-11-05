"use server";

import { getCurrentUser, updateStaffDetails } from "@/lib/data";
import { mobileOf } from "@/lib/mobile";

export type StaffResult = { ok: true } | { ok: false; problem: string };

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");

/** The owner changes a staff member's name, mobile number, designation and (for a driver) vehicle: People › the person › Edit. */
export async function updateStaff(id: string, input: { name: string; mobile: string; designation: string; vehicleId?: string }): Promise<StaffResult> {
  if ((await getCurrentUser()).role !== "owner") return { ok: false, problem: "Only the owner can edit staff." };
  const name = text(input?.name, 60);
  if (name.length < 2 || !/\p{L}/u.test(name)) return { ok: false, problem: "Enter the name." };
  const mobile = mobileOf(text(input.mobile, 20));
  if (mobile.length !== 10) return { ok: false, problem: "Enter the 10-digit mobile number." };
  const designation = text(input.designation, 40);
  if (designation.length < 2) return { ok: false, problem: "Enter the designation, like Driver or Retail manager." };
  const vehicleId = typeof input.vehicleId === "string" ? input.vehicleId : undefined;
  return updateStaffDetails(String(id), { name, mobile, designation, vehicleId });
}
