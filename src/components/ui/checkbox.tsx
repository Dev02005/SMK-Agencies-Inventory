import { Check } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/**
 * The app's tick box: a real checkbox (so keyboards, screen readers and labels work as usual) drawn as a
 * rounded square that fills with the accent colour when ticked.
 */
export function Checkbox({ className, size = "md", ...props }: Omit<ComponentProps<"input">, "type" | "size"> & { size?: "sm" | "md" }) {
  return (
    <span className={cn("relative inline-grid shrink-0 place-items-center", size === "md" ? "size-5" : "size-4", className)}>
      <input type="checkbox" className="peer absolute inset-0 m-0 cursor-pointer opacity-0" {...props} />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none grid size-full place-items-center border-2 border-divider bg-card text-white transition-colors",
          size === "md" ? "rounded-md" : "rounded",
          "peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40 peer-disabled:opacity-40",
          "[&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100",
        )}
      >
        <Check size={size === "md" ? 14 : 11} strokeWidth={3} />
      </span>
    </span>
  );
}
