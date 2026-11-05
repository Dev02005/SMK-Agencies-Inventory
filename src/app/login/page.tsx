import type { Metadata } from "next";
import { getFirm } from "@/lib/data";
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
    <main className="min-h-dvh w-full grid place-items-center px-4 py-10 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(business).replace(/</g, "\u003c") }}
      />

      <div className="w-full max-w-[420px] animate-fade-up">
        {/* Modern white surface card */}
        <div className="surface p-7 sm:p-9">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
