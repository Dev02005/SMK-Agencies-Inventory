import type { ReactNode } from "react";
import { SubNav } from "@/components/ui/sub-nav";

export default function StockLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SubNav
        label="Stock"
        items={[
          { href: "/stock", label: "Godown stock" },
          { href: "/stock/lorries", label: "Lorry stock" },
          { href: "/stock/transfers", label: "Transfers" },
          { href: "/stock/suspense", label: "Suspense loads" },
        ]}
      />
      {children}
    </>
  );
}
