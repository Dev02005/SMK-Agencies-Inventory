"use client";

import { Camera, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import type { Profile } from "@/lib/data/types";
import { changeMyName, changeMyPhoto } from "./actions";

const PHOTO_SIZE = 256;

/** Crops the middle square of a picture and shrinks it to a 256 × 256 JPEG data URL, in the browser. */
async function squarePhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = PHOTO_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  // White behind see-through pictures (PNG), since JPEG has no transparency.
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, PHOTO_SIZE, PHOTO_SIZE);
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

/**
 * The top of Settings › Account: the person's photo and name, each of which they can change. A new photo is cropped
 * to a square and made small on the phone before it is sent.
 */
export function ProfileCard({ user, subtitle }: { user: Pick<Profile, "id" | "fullName" | "initials" | "photoVersion">; subtitle: string }) {
  const id = useId();
  const router = useRouter();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.fullName);
  const [problem, setProblem] = useState<string>();
  const [pending, startTransition] = useTransition();

  function pickPhoto(file: File | undefined) {
    if (!file || pending) return;
    if (!file.type.startsWith("image/")) {
      toast("Choose a photo (JPG or PNG).");
      return;
    }
    startTransition(async () => {
      let photo: string;
      try {
        photo = await squarePhoto(file);
      } catch {
        toast("Couldn't read that photo. Try another one.");
        return;
      }
      const result = await changeMyPhoto(photo);
      if (!result.ok) {
        toast(result.problem);
        return;
      }
      toast("Profile photo updated.");
      router.refresh();
    });
  }

  function removePhoto() {
    if (pending) return;
    startTransition(async () => {
      const result = await changeMyPhoto(null);
      if (!result.ok) {
        toast(result.problem);
        return;
      }
      toast("Profile photo removed.");
      router.refresh();
    });
  }

  function saveName() {
    if (pending) return;
    const clean = name.trim().replace(/\s+/g, " ");
    if (clean === user.fullName) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const result = await changeMyName(clean);
      if (!result.ok) {
        setProblem(result.problem);
        return;
      }
      toast("Name updated.");
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <section className="surface p-5 md:p-6">
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <Avatar person={user} className="size-20 bg-accent-soft text-[26px] text-accent" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={pending}
            aria-label={user.photoVersion ? "Change profile photo" : "Add profile photo"}
            title={user.photoVersion ? "Change photo" : "Add photo"}
            className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full border-2 border-card bg-accent text-white shadow-card hover:bg-[#0071e3] disabled:opacity-60"
          >
            <Camera size={15} strokeWidth={2} aria-hidden />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              pickPhoto(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          {!editing ? (
            <>
              <div className="flex items-center gap-1.5">
                <h2 className="truncate text-[22px] font-semibold tracking-[-0.3px] text-ink">{user.fullName}</h2>
                <button
                  type="button"
                  onClick={() => {
                    setName(user.fullName);
                    setProblem(undefined);
                    setEditing(true);
                  }}
                  aria-label="Edit name"
                  title="Edit name"
                  className="grid size-8 shrink-0 place-items-center rounded-full text-ink-secondary hover:bg-hairline hover:text-ink"
                >
                  <Pencil size={16} strokeWidth={1.9} aria-hidden />
                </button>
              </div>
              <p className="text-[15px] text-ink-secondary">{subtitle}</p>
            </>
          ) : (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                saveName();
              }}
            >
              <Field label="Your name" htmlFor={`${id}-name`} error={problem} hint="Shown on your screens and to the owner">
                <input
                  id={`${id}-name`}
                  className={inputClass}
                  value={name}
                  maxLength={60}
                  autoComplete="name"
                  autoFocus
                  onChange={(e) => {
                    setName(e.target.value);
                    setProblem(undefined);
                  }}
                  onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
                  aria-invalid={problem ? true : undefined}
                />
              </Field>
              <div className="flex items-center gap-4">
                <Button type="submit" disabled={pending || name.trim().length < 2}>
                  {pending ? "Saving…" : "Save name"}
                </Button>
                <Button variant="plain" onClick={() => setEditing(false)} disabled={pending}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-hairline pt-3">
        <Button variant="plain" onClick={() => fileRef.current?.click()} disabled={pending} className="gap-1.5">
          <Camera size={16} strokeWidth={1.9} aria-hidden />
          {pending ? "Saving…" : user.photoVersion ? "Change photo" : "Upload photo"}
        </Button>
        {user.photoVersion && (
          <Button variant="plain" onClick={removePhoto} disabled={pending} className="gap-1.5 text-danger">
            <Trash2 size={16} strokeWidth={1.9} aria-hidden />
            Remove photo
          </Button>
        )}
      </div>
    </section>
  );
}
