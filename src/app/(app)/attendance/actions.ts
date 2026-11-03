"use server";

import { getCurrentUser, markMyAttendance } from "@/lib/data";

export type CheckResult = { ok: true; time: string } | { ok: false; problem: string };

/** Staff check themselves in or out; each person only ever marks their own day. */
export async function checkInOrOut(kind: "in" | "out"): Promise<CheckResult> {
  if ((await getCurrentUser()).role === "owner") return { ok: false, problem: "The owner doesn't check in; staff attendance is under People › Attendance." };
  return markMyAttendance(kind === "out" ? "out" : "in");
}
