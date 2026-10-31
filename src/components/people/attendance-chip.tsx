import { Chip, type ChipTone } from "@/components/ui/chip";
import type { AttendanceRecord, AttendanceStatus } from "@/lib/data/types";

export const attendanceLabels: Record<AttendanceStatus, { label: string; tone: ChipTone; dot: string }> = {
  present: { label: "Present", tone: "good", dot: "bg-good" },
  half_day: { label: "Half day", tone: "warning", dot: "bg-warning" },
  leave: { label: "Leave", tone: "accent", dot: "bg-accent" },
  absent: { label: "Absent", tone: "danger", dot: "bg-danger" },
  holiday: { label: "Weekly off", tone: "neutral", dot: "bg-hairline" },
};

/** Today's status: "Present 09:12", "Late 09:24", "Absent"…; "Not checked in" when there's no record yet. */
export function AttendanceChip({ record }: { record?: AttendanceRecord }) {
  if (!record) return <Chip>Not checked in</Chip>;
  const meta = attendanceLabels[record.status];
  if (record.status === "present" && record.late) return <Chip tone="warning">Late · {record.checkIn}</Chip>;
  return (
    <Chip tone={meta.tone}>
      {meta.label}
      {record.checkIn && ` · ${record.checkIn}`}
    </Chip>
  );
}
