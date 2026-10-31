import type { ReactNode } from "react";
import type { Firm } from "@/lib/data/types";

/**
 * A4 page for bills, quotations and statements: white sheet on screen, plain page when printed.
 * Uses fixed print colours (not the app tokens) so it looks the same on paper.
 */
export function PrintSheet({ children }: { children: ReactNode }) {
  return (
    <article className="mx-auto w-full max-w-[794px] overflow-hidden rounded-card bg-white text-[13px] text-[#1d1d1f] shadow-card print:max-w-none print:rounded-none print:shadow-none">
      {children}
    </article>
  );
}

/** SKA letterhead, modelled on the firm's existing quotation header. */
export function Letterhead({ firm, owner }: { firm: Firm; owner: string }) {
  return (
    <header className="border-b-4 border-[#0071e3]">
      <div className="flex items-center gap-4 px-6 py-5 md:px-10">
        <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-[#0071e3] text-[17px] font-bold tracking-tight text-white">
          SKA
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[22px] font-bold uppercase leading-tight tracking-[-0.3px] md:text-[26px]">{firm.name}</p>
          <p className="text-[12px] text-[#6e6e73]">Wholesale dealers in cement &amp; iron · {firm.address}</p>
        </div>
        <div className="hidden shrink-0 text-right text-[12px] leading-5 sm:block">
          <p>
            <span className="text-[#6e6e73]">GSTIN </span>
            {firm.gstin}
          </p>
          <p>
            <span className="text-[#6e6e73]">Cell </span>
            {firm.phone}
          </p>
          <p className="font-medium">{owner}, Proprietor</p>
        </div>
      </div>
    </header>
  );
}

export function PrintFooter({ children }: { children?: ReactNode }) {
  return (
    <footer className="mt-8 bg-[#f5f5f7] px-6 py-3 text-center text-[12px] text-[#6e6e73] md:px-10">
      {children ?? "Wholesale dealers in cement & iron merchants · Assuring the best of our services"}
    </footer>
  );
}
