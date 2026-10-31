"use client";

import { LogIn, LogOut, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useViewAs } from "@/lib/roles";

/**
 * Staff check in and out from their phone. With the database connected this records the time and,
 * if the staff member agreed to it, the phone's location at that moment (never tracked in between).
 */
export function CheckInCard({ checkedInAt }: { checkedInAt: Record<string, string | undefined> }) {
  const [role] = useViewAs();
  const toast = useToast();
  if (role === "owner") return null;
  const time = checkedInAt[role];

  return (
    <section className="surface flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
      <div>
        <h2 className="text-[17px] font-semibold tracking-[-0.3px] text-ink">{time ? `You checked in at ${time}` : "You haven't checked in today"}</h2>
        <p className="mt-0.5 flex items-center gap-1 text-[13px] text-ink-secondary">
          <MapPin size={13} strokeWidth={1.75} aria-hidden /> Your location is saved only at check-in and check-out.
        </p>
      </div>
      <Button
        className="md:w-auto"
        onClick={() =>
          toast(time ? "Sample mode: check-out time and location would be saved." : "Sample mode: check-in time and location would be saved.")
        }
      >
        {time ? <LogOut size={18} strokeWidth={1.75} aria-hidden /> : <LogIn size={18} strokeWidth={1.75} aria-hidden />}
        {time ? "Check out" : "Check in"}
      </Button>
    </section>
  );
}
