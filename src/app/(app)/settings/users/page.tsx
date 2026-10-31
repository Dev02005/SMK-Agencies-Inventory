import type { Metadata } from "next";
import { SimpleForm } from "@/components/forms/simple-form";
import { BackLink, SampleChip, SectionCard } from "@/components/ui/blocks";
import { Chip } from "@/components/ui/chip";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { getProfiles } from "@/lib/data";
import { allRoles, roleLabels as roleNames } from "@/lib/labels";

export const metadata: Metadata = { title: "Users & roles" };

export default async function UserSettingsPage() {
  const profiles = await getProfiles();
  return (
    <div className="animate-fade-up mx-auto max-w-[760px] space-y-4">
      <PageHeader
        back={<BackLink href="/settings">Settings</BackLink>}
        title="Users & roles"
        subtitle="Each person logs in with their own mobile number"
        actions={<SampleChip />}
      />
      <DataTable
        rows={profiles}
        rowKey={(p) => p.id}
        mobile={(p) => ({
          title: p.fullName,
          subtitle: `+91 ${p.mobile}`,
          meta: <Chip tone={p.role === "owner" ? "accent" : "neutral"}>{roleNames[p.role]}</Chip>,
        })}
        columns={[
          { key: "name", header: "Name", cell: (p) => p.fullName },
          { key: "mobile", header: "Mobile", cell: (p) => `+91 ${p.mobile}`, className: "tabular-nums text-ink-secondary" },
          { key: "role", header: "Role", cell: (p) => <Chip tone={p.role === "owner" ? "accent" : "neutral"}>{roleNames[p.role]}</Chip> },
          { key: "status", header: "", align: "right", cell: (p) => (p.active ? <Chip tone="good">Active</Chip> : <Chip>Inactive</Chip>) },
        ]}
      />
      <SectionCard title="Add a user">
        <SimpleForm
          thing="user"
          submitLabel="Add user"
          fields={[
            { name: "name", label: "Full name", required: true },
            { name: "mobile", label: "Mobile number", prefix: "+91", required: true },
            {
              name: "role",
              label: "Role",
              type: "select",
              wide: true,
              options: allRoles.filter((r) => r !== "owner").map((r) => ({ value: r, label: roleNames[r] })),
              hint: "Sets which screens they see; the owner can change it later",
            },
          ]}
        />
      </SectionCard>
    </div>
  );
}
