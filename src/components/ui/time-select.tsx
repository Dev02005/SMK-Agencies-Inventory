"use client";

import { Select } from "@/components/ui/select";

const pad = (n: number) => String(n).padStart(2, "0");

// Every quarter of an hour, shown as "8:15 am"; the value stays "08:15" like a native time input.
const times = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4);
  const m = (i % 4) * 15;
  return { value: `${pad(h)}:${pad(m)}`, label: `${h % 12 || 12}:${pad(m)} ${h < 12 ? "am" : "pm"}` };
});

/** The app's time field: the app's dropdown with quarter-hour times (search by typing "8:30"). */
export function TimeSelect({ id, value, onChange, label }: { id?: string; value: string; onChange: (value: string) => void; label: string }) {
  return <Select id={id} label={label} value={value} onChange={onChange} options={times} searchable />;
}
