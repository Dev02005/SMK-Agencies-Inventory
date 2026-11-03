"use server";

import { deleteDestination, deleteRentDriver, getCurrentUser } from "@/lib/data";

type Result = { ok: true } | { ok: false; problem: string };

const canEdit = async () => {
  const user = await getCurrentUser();
  return user.role === "owner" || user.role === "office";
};

export async function removeDestination(name: string): Promise<Result> {
  if (!(await canEdit())) return { ok: false, problem: "Only the owner and the office can delete destinations." };
  return (await deleteDestination(String(name))) ? { ok: true } : { ok: false, problem: "That destination is no longer in the list." };
}

export async function removeRentDriver(name: string): Promise<Result> {
  if (!(await canEdit())) return { ok: false, problem: "Only the owner and the office can delete rent drivers." };
  return (await deleteRentDriver(String(name))) ? { ok: true } : { ok: false, problem: "That driver is no longer in the list." };
}
