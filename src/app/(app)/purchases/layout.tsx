import type { ReactNode } from "react";
import { SubNav } from "@/components/ui/sub-nav";

export default function PurchasesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SubNav
        label="Purchases"
        items={[
          { href: "/purchases", label: "Godown" },
          { href: "/purchases/lorries", label: "Lorry", roles: ["owner"] },
        ]}
      />
      {children}
    </>
  );
}
