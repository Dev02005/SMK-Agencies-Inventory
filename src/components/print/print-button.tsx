"use client";

import { Printer } from "lucide-react";
import { IconButton } from "@/components/ui/button";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <IconButton label={label} variant="primary" onClick={() => window.print()}>
      <Printer size={19} strokeWidth={1.9} aria-hidden />
    </IconButton>
  );
}
