import type { Metadata } from "next";
import Image from "next/image";
import { SampleChip } from "@/components/ui/blocks";
import { getFirm } from "@/lib/data";
import { siteDescriptionFor, siteUrl } from "@/lib/site";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Sign in",
    description: siteDescriptionFor(await getFirm()),
    alternates: { canonical: "/login" },
    robots: { index: true, follow: false },
  };
}

export default async function LoginPage() {
  const firm = await getFirm();
  // Business details for search engines (shown as the business's name, address and phone in results).
  const business = {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    name: firm.name,
    description: siteDescriptionFor(firm),
    url: `${siteUrl}/login`,
    logo: `${siteUrl}/icon/512`,
    telephone: `+91${firm.phone}`,
    taxID: firm.gstin,
    address: { "@type": "PostalAddress", streetAddress: firm.address, addressCountry: "IN" },
  };

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(business).replace(/</g, "\u003c") }} />
      <div className="animate-fade-up w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image src="/icon.svg" alt="" width={64} height={64} unoptimized className="mb-5 rounded-[16px]" />
          <h1 className="text-[28px] font-semibold tracking-[-0.4px] text-ink">Sign in to SKA</h1>
          <p className="mt-1 text-[15px] text-ink-secondary">{firm.name}</p>
          <div className="mt-3">
            <SampleChip />
          </div>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
