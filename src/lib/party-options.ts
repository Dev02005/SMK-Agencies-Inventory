import type { SelectOption } from "@/components/ui/select";
import type { Party } from "@/lib/data/types";

const groupOf: Partial<Record<Party["kind"], string>> = { customer: "Customers", sub_dealer: "Sub-dealers" };
const order: Party["kind"][] = ["cash", "customer", "sub_dealer"];

/**
 * Party picker rows: Cash customer first, then "Customers" and "Sub-dealers" as groups that open when tapped.
 * Other kinds (companies, lorry owners) are left out; `label` lets a form show more than the name.
 */
export function partyOptions(parties: Pick<Party, "id" | "name" | "place" | "kind">[], label: (p: Pick<Party, "name" | "place">) => string = (p) => p.name): SelectOption[] {
  return parties
    .filter((p) => order.includes(p.kind))
    .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))
    .map((p) => ({ value: p.id, label: label(p), hint: p.place, group: groupOf[p.kind] }));
}
