import type { Metadata } from "next";
import { ModuleGrid } from "@/components/ui/module-grid";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "More" };

export default function MorePage() {
  return (
    <div className="animate-fade-up">
      <PageHeader title="More" subtitle="Every part of the app you can open" />
      <ModuleGrid />
    </div>
  );
}
