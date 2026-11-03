"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { SectionCard } from "@/components/ui/blocks";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { DEVICE_LORRY_KEY, type DeviceLorry } from "@/lib/lorries";
import { importDeviceLorries } from "./actions";

const readRaw = () => {
  try {
    return window.localStorage.getItem(DEVICE_LORRY_KEY);
  } catch {
    return null;
  }
};

const subscribe = (callback: () => void) => {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
};

/**
 * Lorry purchases an older version of the app kept in this browser only. Shown until they are moved into the app's
 * data, so they appear on every device and get the sale-update reminder.
 */
export function DeviceLorryImport() {
  const router = useRouter();
  const toast = useToast();
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  const [moved, setMoved] = useState(false);
  const [pending, startTransition] = useTransition();
  const lorries = useMemo<DeviceLorry[]>(() => {
    try {
      const value = JSON.parse(raw ?? "null");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }, [raw]);

  if (moved || lorries.length === 0) return null;
  return (
    <SectionCard title="Lorries saved only in this browser" className="mb-4 border border-warning/40">
      <p className="-mt-2 text-[14px] text-ink-secondary">
        {lorries.length} lorry {lorries.length === 1 ? "purchase was" : "purchases were"} saved in this browser by an older version of the app ({lorries.map((l) => l.lorryNo).join(", ")}). Move
        them into the app so they show on every device and get the sale-update reminder.
      </p>
      <Button
        className="mt-3"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await importDeviceLorries(lorries);
            if (!result.ok) {
              toast(result.problem);
              return;
            }
            try {
              window.localStorage.removeItem(DEVICE_LORRY_KEY);
            } catch {
              // Already moved; the copy left here is only hidden.
            }
            setMoved(true);
            toast(`${result.saved} moved into the app${result.skipped ? `, ${result.skipped} skipped (already there or incomplete)` : ""}.`);
            router.refresh();
          })
        }
      >
        {pending ? "Moving…" : "Move them into the app"}
      </Button>
    </SectionCard>
  );
}
