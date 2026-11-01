import type { ReactNode } from "react";
import { SubNav } from "@/components/ui/sub-nav";

export default function SalesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SubNav
        label="Sales"
        items={[
          { href: "/sales", label: "Godown sales" },
          { href: "/sales/lorries", label: "Lorry sales" },
        ]}
      />
      {children}
    </>
  );
}
