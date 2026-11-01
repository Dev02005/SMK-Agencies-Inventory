import type { Metadata } from "next";
import Image from "next/image";
import { NewPasswordForm } from "./new-password-form";

export const metadata: Metadata = {
  title: "Set your password",
  robots: { index: false, follow: false },
};

/** Shown once, straight after someone signs in with their starting password (their mobile number). */
export default function NewPasswordPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="animate-fade-up w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image src="/icon.svg" alt="" width={64} height={64} unoptimized className="mb-5 rounded-[16px]" />
          <h1 className="text-[28px] font-semibold tracking-[-0.4px] text-ink">Set your own password</h1>
          <p className="mt-1 text-[15px] text-ink-secondary">
            You signed in with your mobile number. Choose a password only you know; you&apos;ll use it from now on.
          </p>
        </div>
        <NewPasswordForm />
      </div>
    </main>
  );
}
