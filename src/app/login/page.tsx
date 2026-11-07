import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { Receipt, Truck, Warehouse } from "lucide-react";
import { getFirm, getSignInPeople } from "@/lib/data";
import { siteDescriptionFor, siteUrl } from "@/lib/site";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const firm = await getFirm();
  return {
    title: `Sign in • ${firm.name}`,
    description: siteDescriptionFor(firm),
    alternates: { canonical: "/login" },
    robots: { index: true, follow: false },
  };
}

/**
 * Geometric concentric Spirograph line-art mesh matching the reference style.
 */
function SpirographMesh({ className }: { className?: string }) {
  const count = 30;
  const ellipses = Array.from({ length: count }, (_, i) => {
    const angle = (i * 360) / count;
    return (
      <ellipse
        key={i}
        cx="280"
        cy="280"
        rx="200"
        ry="86"
        transform={`rotate(${angle} 280 280)`}
        fill="none"
        stroke="currentColor"
        strokeWidth="0.8"
      />
    );
  });

  return (
    <svg
      viewBox="0 0 560 560"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="spiro-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#d4af37" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="280" cy="280" r="160" fill="url(#spiro-glow)" />
      <g stroke="currentColor" opacity="0.35">
        {ellipses}
      </g>
      <circle cx="280" cy="280" r="72" stroke="currentColor" strokeWidth="0.9" opacity="0.45" />
      <circle cx="280" cy="280" r="145" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
      <circle cx="280" cy="280" r="230" stroke="currentColor" strokeWidth="0.5" opacity="0.18" />
    </svg>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="w-full animate-pulse space-y-6">
      <div>
        <div className="h-9 w-48 bg-slate-200 rounded-xl mb-2" />
        <div className="h-4 w-64 bg-slate-100 rounded-md" />
      </div>
      <div className="space-y-4 pt-2">
        <div>
          <div className="h-3 w-20 bg-slate-100 rounded mb-2" />
          <div className="h-[52px] w-full bg-slate-100 rounded-2xl" />
        </div>
        <div className="h-[50px] w-full bg-slate-200 rounded-2xl" />
      </div>
    </div>
  );
}

async function LoginPanel() {
  const people = await getSignInPeople();
  return <LoginForm people={people} />;
}

export default async function LoginPage() {
  const firm = await getFirm();

  const business = {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    name: firm.name,
    description: siteDescriptionFor(firm),
    url: `${siteUrl}/login`,
    logo: `${siteUrl}/logo.png`,
    telephone: `+91${firm.phone}`,
    taxID: firm.gstin,
    address: { "@type": "PostalAddress", streetAddress: firm.address, addressCountry: "IN" },
  };

  return (
    <main className="h-dvh max-h-dvh w-full overflow-hidden flex flex-col lg:grid lg:grid-cols-12 bg-white selection:bg-[#0068d1] selection:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(business).replace(/</g, "\u003c") }}
      />

      {/* LEFT COLUMN: Customer-Facing Brand Showcase with Geometric Wireframe (Dark Executive Theme) */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#061224] via-[#091b36] to-[#040d1a] text-white lg:col-span-7 xl:col-span-7 flex flex-col justify-between p-5 sm:p-7 lg:p-7 xl:p-9 h-full max-h-dvh">
        {/* Ambient Radial Lighting */}
        <div
          className="absolute -top-32 -left-32 size-96 rounded-full bg-[#0068d1]/15 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute top-1/2 right-0 size-80 rounded-full bg-[#38bdf8]/10 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        {/* Geometric Spirograph Graphic in bottom right */}
        <div className="absolute -bottom-28 -right-28 w-[420px] sm:w-[500px] text-white/25 pointer-events-none select-none">
          <SpirographMesh className="w-full h-auto" />
        </div>

        {/* TOP BRAND HEADER */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="size-10 sm:size-11 rounded-xl bg-gradient-to-tr from-[#ea580c] via-[#f59e0b] to-[#fbbf24] p-0.5 shadow-md flex items-center justify-center shrink-0 border border-white/20">
            <div className="size-full rounded-[10px] bg-[#0c1e38]/90 flex items-center justify-center p-1 backdrop-blur-sm">
              <Image
                src="/logo.png"
                alt="SKA"
                width={34}
                height={34}
                priority
                className="object-contain"
              />
            </div>
          </div>
          <div>
            <h2 className="text-[17px] sm:text-[18px] font-bold tracking-tight text-white leading-tight">
              {firm.name}
            </h2>
            <p className="text-[10px] font-semibold tracking-[0.2em] text-[#38bdf8] uppercase">
              Cement &amp; Steel Wholesale &amp; Retail
            </p>
            <p className="text-[11.5px] text-white/75 font-medium">
              Proprietor: Kamesh Potnuru
            </p>
          </div>
        </div>

        {/* MIDDLE HERO CONTENT & CUSTOMER-FACING HIGHLIGHT CARDS */}
        <div className="relative z-10 my-auto py-2 max-w-xl">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-1.5 mb-1.5">
            <span className="size-1.5 rounded-full bg-[#38bdf8]" />
            <span className="text-[10px] sm:text-[10.5px] font-bold tracking-[0.22em] text-[#38bdf8] uppercase">
              DEALERSHIP PORTAL
            </span>
          </div>

          {/* Hero Headline */}
          <h1 className="font-serif text-[26px] sm:text-[32px] xl:text-[36px] font-normal leading-[1.12] text-white tracking-tight">
            Every shipment,{" "}
            <span className="italic font-serif text-[#93c5fd]">flawlessly</span> managed.
          </h1>

          {/* Location & Dealership Subtitle */}
          <p className="mt-2 text-[12px] sm:text-[12.5px] leading-relaxed text-slate-300/80 line-clamp-2">
            Authorized Dealer: UltraTech · Maha · Deccan · Sagar Cements · Premium TMT Steel &amp; MS Bars ·
            Godowns at Polaki &amp; Srikakulam · Direct Mill Supplies · {firm.phone} / 99636 84551
          </p>

          {/* 3 Reference Feature Cards (Matching Reference Image) */}
          <div className="mt-3.5 sm:mt-5 space-y-2 sm:space-y-2.5">
            {/* Card 1: Multi-Godown Inventory */}
            <div className="rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 p-2.5 sm:p-3 backdrop-blur-md transition-all flex items-center gap-3.5 shadow-xs">
              <div className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-xl bg-sky-500/15 border border-sky-400/30 text-sky-400 shrink-0">
                <Warehouse size={19} strokeWidth={2} aria-hidden />
              </div>
              <div>
                <p className="text-[13.5px] sm:text-[14px] font-bold text-white tracking-tight">Multi-Godown Inventory</p>
                <p className="text-[11px] sm:text-[11.5px] text-slate-300/80 leading-snug mt-0.5">
                  Live stock tracking across Polaki, Srikakulam &amp; company depot godowns
                </p>
              </div>
            </div>

            {/* Card 2: Wholesale & Retail Billing */}
            <div className="rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 p-2.5 sm:p-3 backdrop-blur-md transition-all flex items-center gap-3.5 shadow-xs">
              <div className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-400 shrink-0">
                <Receipt size={19} strokeWidth={2} aria-hidden />
              </div>
              <div>
                <p className="text-[13.5px] sm:text-[14px] font-bold text-white tracking-tight">Wholesale &amp; Retail Billing</p>
                <p className="text-[11px] sm:text-[11.5px] text-slate-300/80 leading-snug mt-0.5">
                  Instant counter sales, wholesale orders &amp; owner price approval workflow
                </p>
              </div>
            </div>

            {/* Card 3: Mill Dispatches & Fleet */}
            <div className="rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 p-2.5 sm:p-3 backdrop-blur-md transition-all flex items-center gap-3.5 shadow-xs">
              <div className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-400 shrink-0">
                <Truck size={19} strokeWidth={2} aria-hidden />
              </div>
              <div>
                <p className="text-[13.5px] sm:text-[14px] font-bold text-white tracking-tight">Mill Dispatches &amp; Fleet</p>
                <p className="text-[11px] sm:text-[11.5px] text-slate-300/80 leading-snug mt-0.5">
                  Direct mill lorry shipments, freight tracking &amp; driver cash management
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM FOOTER */}
        <div className="relative z-10 pt-2 text-[11px] text-slate-400/70 font-medium flex items-center justify-between">
          <p>© 2026 D2W</p>
          <p className="hidden sm:block text-slate-500/60">Authorized Commercial Dealership</p>
        </div>
      </section>

      {/* RIGHT COLUMN: Clean White Sign-in Form */}
      <section className="lg:col-span-5 xl:col-span-5 flex items-center justify-center p-5 sm:p-7 lg:p-7 xl:p-9 bg-[#fafafc] lg:bg-white h-full max-h-dvh overflow-hidden">
        <div className="w-full max-w-[380px] sm:max-w-[400px]">
          <Suspense fallback={<LoginFormSkeleton />}>
            <LoginPanel />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
