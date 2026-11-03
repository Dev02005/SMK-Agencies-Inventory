"use client";

import { LogIn, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { IconButton } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { checkInOrOut } from "./actions";

/** Today's check-in and check-out for the signed-in person, saved with the time it was pressed. */
export function CheckIn({ checkIn, checkOut }: { checkIn?: string; checkOut?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const kind = checkIn ? "out" : "in";

  return (
    <section className="surface flex items-center justify-between gap-4 p-5 md:p-6">
      <div>
        <h2 className="text-[17px] font-semibold tracking-[-0.3px] text-ink">
          {checkOut ? `You checked out at ${checkOut}` : checkIn ? `You checked in at ${checkIn}` : "You haven't checked in today"}
        </h2>
        <p className="mt-0.5 text-[13px] text-ink-secondary">
          {checkIn && checkOut ? `In at ${checkIn} · out at ${checkOut}. See you tomorrow.` : checkIn ? "Check out when you leave for the day." : "Check in when you start work."}
        </p>
      </div>
      {!checkOut && (
        <IconButton
          label={kind === "in" ? "Check in" : "Check out"}
          variant="primary"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await checkInOrOut(kind);
              if (!result.ok) {
                toast(result.problem);
                return;
              }
              toast(kind === "in" ? `Checked in at ${result.time}` : `Checked out at ${result.time}`);
              router.refresh();
            })
          }
        >
          {kind === "in" ? <LogIn size={19} strokeWidth={1.9} aria-hidden /> : <LogOut size={19} strokeWidth={1.9} aria-hidden />}
        </IconButton>
      )}
    </section>
  );
}
