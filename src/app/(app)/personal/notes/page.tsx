import { CalendarClock, Pin } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { SimpleForm } from "@/components/forms/simple-form";
import { ListSkeleton, SampleChip, SectionCard } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/cn";
import { getNotes } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { isPersonalUnlocked } from "@/lib/personal-lock";
import { PersonalSection } from "../personal-section";

export const metadata: Metadata = { title: "Notes" };

export default function NotesPage() {
  return (
    <PersonalSection>
      <NotesContent />
    </PersonalSection>
  );
}

function NotesContent() {
  return (
    <>
      <PageHeader title="Notes & reminders" subtitle="Anything you want to remember; reminders come as a notification on the day" actions={<SampleChip />} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<ListSkeleton rows={4} />}>
            <NoteList />
          </Suspense>
        </div>
        <SectionCard title="New note">
          <SimpleForm
            thing="note"
            submitLabel="Save note"
            fields={[
              { name: "title", label: "Title", required: true, wide: true },
              { name: "body", label: "Note", type: "textarea", wide: true },
              { name: "remind", label: "Remind me on", type: "date", wide: true },
            ]}
          />
        </SectionCard>
      </div>
    </>
  );
}

async function NoteList() {
  // Checked here, next to the data: the layout alone cannot stop a page from rendering.
  if (!(await isPersonalUnlocked())) return null;
  const notes = await getNotes();
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {notes.map((n) => (
        <li key={n.id} className={cn("surface p-5", n.pinned && "bg-warning-soft/50")}>
          <p className="flex items-start gap-1.5 text-[17px] font-semibold tracking-[-0.3px] text-ink">
            {n.pinned && <Pin size={15} strokeWidth={2} className="mt-1 shrink-0 text-warning" aria-label="Pinned" />}
            {n.title}
          </p>
          <p className="mt-1 text-[15px] leading-[22px] text-ink-secondary">{n.body}</p>
          {n.remindOn && (
            <p className="mt-3 flex items-center gap-1.5 text-[13px] text-ink-secondary">
              <CalendarClock size={14} strokeWidth={1.75} aria-hidden /> {formatDate(n.remindOn)}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
