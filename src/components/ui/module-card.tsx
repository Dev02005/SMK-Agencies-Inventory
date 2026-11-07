import Link from "next/link";
import { cn } from "@/lib/cn";
import { toneClasses, type Section } from "@/lib/sections";

/** Feature module card with signature squircle icon container. */
export function ModuleCard({ section }: { section: Section }) {
  const Icon = section.icon;
  return (
    <Link
      href={section.href}
      className="surface group flex flex-col items-center px-4 py-6 text-center transition hover:-translate-y-0.5 hover:shadow-raised"
    >
      {/* Signature Squircle Icon Container */}
      <span className={cn("mb-3 grid size-12 place-items-center rounded-2xl shadow-xs transition-transform group-hover:scale-105", toneClasses[section.tone])}>
        <Icon size={22} strokeWidth={2} aria-hidden />
      </span>
      <span className="text-[17px] font-semibold tracking-[-0.3px] text-ink group-hover:text-accent transition-colors">
        {section.title}
      </span>
      <span className="mt-1 text-[13px] leading-[18px] text-ink-secondary">{section.description}</span>
    </Link>
  );
}
