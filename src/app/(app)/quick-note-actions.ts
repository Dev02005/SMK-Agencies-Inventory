"use server";

import { addMyQuickNote, getMyQuickNotes, removeMyQuickNote, type QuickNote } from "@/lib/data";

const MAX_LENGTH = 1000;
const MAX_NOTES = 200;

/** The signed-in person's quick notes, newest first. */
export async function listQuickNotes(): Promise<QuickNote[]> {
  return getMyQuickNotes();
}

export async function saveQuickNote(text: string): Promise<{ ok: true; note: QuickNote } | { ok: false; problem: string }> {
  const clean = typeof text === "string" ? text.trim() : "";
  if (!clean) return { ok: false, problem: "Write something first." };
  if (clean.length > MAX_LENGTH) return { ok: false, problem: `Keep a note under ${MAX_LENGTH} letters.` };
  if ((await getMyQuickNotes()).length >= MAX_NOTES) return { ok: false, problem: "You have a lot of notes; delete some old ones first." };
  return { ok: true, note: await addMyQuickNote(clean) };
}

export async function deleteQuickNote(id: string): Promise<boolean> {
  return typeof id === "string" && removeMyQuickNote(id);
}
