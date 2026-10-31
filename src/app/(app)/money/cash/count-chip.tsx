import { Chip } from "@/components/ui/chip";
import { formatINR } from "@/lib/format";

/** Counted cash against the expected closing: matched, short or extra. */
export function CountChip({ counted, difference }: { counted?: number; difference?: number }) {
  if (counted === undefined || difference === undefined) return <Chip>Not counted</Chip>;
  if (difference === 0) return <Chip tone="good">Count matches</Chip>;
  return difference < 0 ? <Chip tone="danger">Short {formatINR(-difference)}</Chip> : <Chip tone="warning">Extra {formatINR(difference)}</Chip>;
}
