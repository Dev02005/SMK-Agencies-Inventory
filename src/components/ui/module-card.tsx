import Link from "next/link";
import { cn } from "@/lib/cn";
import { toneClasses, type Section } from "@/lib/sections";

/** OrbWeather-style feature card: coloured line icon, title, one grey line. */
export function ModuleCard({ section }: { section: Section }) {
  const Icon = section.icon;
  return (
    <Link
      href={section.href}
      className="surface flex flex-col items-center px-4 py-6 text-center transition hover:-translate-y-0.5 hover:shadow-raised"
    >
      <span className={cn("mb-3 grid size-11 place-items-center rounded-full", toneClasses[section.tone])}>
        <Icon size={22} strokeWidth={1.75} aria-hidden />
      </span>
      <span className="text-[17px] font-semibold tracking-[-0.3px] text-ink">{section.title}</span>
      <span className="mt-1 text-[13px] leading-[18px] text-ink-secondary">{section.description}</span>
    </Link>
  );
}
