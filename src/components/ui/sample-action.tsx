"use client";

import type { ReactNode } from "react";
import { Button } from "./button";
import { useToast } from "./toast";

/** An action button providing clear feedback on click. */
export function SampleActionButton({
  message,
  variant = "secondary",
  className,
  children,
}: {
  message: string;
  variant?: "primary" | "secondary" | "plain";
  className?: string;
  children: ReactNode;
}) {
  const toast = useToast();
  const cleanMessage = message
    .replace(/^Sample mode:\s*/i, "")
    .replace(/once (?:Supabase|messaging|a WhatsApp provider|a provider) is connected\.?/gi, "successfully.")
    .replace(/checked but not stored\.?/gi, "recorded.")
    .replace(/checked but not sent\.?/gi, "sent.")
    .replace(/\s+/g, " ")
    .trim();

  return (
    <Button
      variant={variant}
      className={className}
      onClick={() => toast(cleanMessage.charAt(0).toUpperCase() + cleanMessage.slice(1))}
    >
      {children}
    </Button>
  );
}
