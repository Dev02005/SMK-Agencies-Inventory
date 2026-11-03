import { Suspense } from "react";
import { getBankAccounts, getLorries, getMyGodowns, getParties, getProducts, getProfiles, getVehicles } from "@/lib/data";
import { OriginChip } from "./blocks";

type Kind = "products" | "godowns" | "staff" | "parties" | "banks" | "vehicles" | "lorries";

const load: Record<Kind, () => Promise<{ original?: boolean }[]>> = {
  products: getProducts,
  godowns: getMyGodowns,
  staff: async () => (await getProfiles()).filter((p) => p.role !== "owner"),
  parties: getParties,
  banks: () => getBankAccounts("business"),
  vehicles: getVehicles,
  lorries: getLorries,
};

/** A page's data tag (Original data, Sample data, or both), worked out from the records it lists. Server only. */
export function DataOrigin({ of }: { of: Kind }) {
  return (
    <Suspense fallback={null}>
      <Tag of={of} />
    </Suspense>
  );
}

async function Tag({ of }: { of: Kind }) {
  return <OriginChip records={await load[of]()} />;
}
