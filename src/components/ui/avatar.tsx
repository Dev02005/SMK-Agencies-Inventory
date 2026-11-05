import { cn } from "@/lib/cn";
import type { Profile } from "@/lib/data/types";

/** A person's round photo, or their initials when they have none. Size and text size come from `className`. */
export function Avatar({ person, className }: { person: Pick<Profile, "id" | "initials" | "photoVersion">; className?: string }) {
  return (
    <span aria-hidden className={cn("grid shrink-0 place-items-center overflow-hidden rounded-full font-semibold", className)}>
      {person.photoVersion ? (
        // eslint-disable-next-line @next/next/no-img-element -- a small private photo behind the session; nothing to optimise.
        <img src={`/profile-photo/${encodeURIComponent(person.id)}?v=${person.photoVersion}`} alt="" className="size-full object-cover" />
      ) : (
        person.initials
      )}
    </span>
  );
}
