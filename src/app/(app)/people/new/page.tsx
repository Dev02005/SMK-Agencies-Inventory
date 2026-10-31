import type { Metadata } from "next";
import { SimpleForm } from "@/components/forms/simple-form";
import { BackLink, SampleChip, SectionCard } from "@/components/ui/blocks";
import { PageHeader } from "@/components/ui/page-header";
import { RoleGuard } from "@/components/ui/sub-nav";
import { allRoles, roleLabels } from "@/lib/labels";

export const metadata: Metadata = { title: "New employee" };

export default function NewEmployeePage() {
  return (
    <div className="mx-auto max-w-[640px]">
      <PageHeader back={<BackLink href="/people">People</BackLink>} title="New employee" subtitle="Also creates their login with this mobile number" actions={<SampleChip />} />
      <RoleGuard roles={["owner", "office"]}>
        <SectionCard>
          <SimpleForm
            thing="employee"
            submitLabel="Save employee"
            fields={[
              { name: "name", label: "Full name", required: true, wide: true },
              { name: "mobile", label: "Mobile number", prefix: "+91", required: true },
              { name: "role", label: "Role", type: "select", options: allRoles.filter((r) => r !== "owner").map((r) => ({ value: r, label: roleLabels[r] })) },
              { name: "designation", label: "Designation", placeholder: "e.g. Sales and collections" },
              { name: "joined", label: "Joining date", type: "date" },
              { name: "salary", label: "Monthly salary", type: "number", prefix: "₹", required: true },
              { name: "areas", label: "Areas / route", placeholder: "e.g. Tekkali, Kotabommali" },
            ]}
          />
        </SectionCard>
      </RoleGuard>
    </div>
  );
}
