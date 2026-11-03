import type { Metadata } from "next";
import { SimpleForm } from "@/components/forms/simple-form";
import { BackLink, SampleChip, SectionCard } from "@/components/ui/blocks";
import { Chip } from "@/components/ui/chip";
import { DataTable } from "@/components/ui/data-table";
import { ExportMenu } from "@/components/ui/export-menu";
import { PageHeader } from "@/components/ui/page-header";
import { getDesignations, getProfiles } from "@/lib/data";
import { allRoles, roleLabels as roleNames } from "@/lib/labels";

export const metadata: Metadata = { title: "Users & roles" };

export default async function UserSettingsPage() {
  const [profiles, designations] = await Promise.all([getProfiles(), getDesignations()]);
  return (
    <div className="animate-fade-up mx-auto max-w-[760px] space-y-4">
      <PageHeader
        back={<BackLink href="/settings">Settings</BackLink>}
        title="Users & roles"
        subtitle="Each person signs in with their mobile number or email; their first password is their mobile number"
        actions={
          <>
            <SampleChip />
            <ExportMenu title={"Users and roles"} />
          </>
        }
      />
      <DataTable
        rows={profiles}
        rowKey={(p) => p.id}
        mobile={(p) => ({
          title: p.fullName,
          subtitle: [designations[p.id], `+91 ${p.mobile}`, p.email].filter(Boolean).join(" · "),
          meta: <Chip tone={p.role === "owner" ? "accent" : "neutral"}>{roleNames[p.role]}</Chip>,
        })}
        columns={[
          { key: "name", header: "Name", cell: (p) => p.fullName },
          { key: "designation", header: "Designation", cell: (p) => designations[p.id] ?? "–", className: "text-ink-secondary" },
          { key: "mobile", header: "Mobile", cell: (p) => `+91 ${p.mobile}`, className: "tabular-nums text-ink-secondary" },
          { key: "email", header: "Email", cell: (p) => p.email ?? "–", className: "text-ink-secondary" },
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
            { name: "mobile", label: "Mobile number", prefix: "+91", required: true, hint: "They sign in with it, and it is their first password" },
            { name: "email", label: "Email (optional)", hint: "They can sign in with this instead of the mobile number" },
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
