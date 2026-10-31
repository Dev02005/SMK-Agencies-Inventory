"use client";

import type { ReactNode } from "react";
import { Button } from "./button";
import { useToast } from "./toast";

/** A button whose real action (share, print to WhatsApp, approve…) arrives with Supabase or messaging. */
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
  return (
    <Button variant={variant} className={className} onClick={() => toast(message)}>
      {children}
    </Button>
  );
}
