import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ServiceWorker } from "@/components/shell/service-worker";
import { ToastProvider } from "@/components/ui/toast";
import { siteDescription, siteName, siteUrl } from "@/lib/site";
import "./globals.css";

// Apple devices use their own SF Pro first (see --font-sans); Inter is the close match everywhere else.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: "%s · SKA",
  },
  description: siteDescription,
  applicationName: "SKA",
  category: "business",
  openGraph: {
    type: "website",
    siteName,
    title: siteName,
    description: siteDescription,
    locale: "en_IN",
    url: "/",
  },
  twitter: { card: "summary_large_image", title: siteName, description: siteDescription },
  // Amounts and bill numbers must not turn into phone or address links on iPhone.
  formatDetection: { telephone: false, email: false, address: false },
  appleWebApp: {
    capable: true,
    title: "SKA",
    statusBarStyle: "default",
  },
};

// Light theme only: tell the browser not to apply any dark styling.
export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f5f5f7",
  // Lets the app use the full screen on phones with a notch or home bar; the bars pad themselves with the safe areas.
  viewportFit: "cover",
};

/** Bare root: the app chrome lives in (app)/layout.tsx so the login screen stays clean. */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">
        <ToastProvider>{children}</ToastProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
