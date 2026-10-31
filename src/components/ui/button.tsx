import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "plain";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-colors disabled:pointer-events-none disabled:opacity-40";

const variants: Record<Variant, string> = {
  // One blue pill per screen (Apple style).
  primary: "h-11 px-[21px] text-[17px] bg-accent text-white hover:bg-[#0071e3] active:bg-[#0060c0]",
  secondary: "h-11 px-[21px] text-[15px] bg-card text-accent border border-accent hover:bg-accent-soft",
  plain: "h-auto px-0 text-[15px] text-link hover:underline",
};

export function buttonClass(variant: Variant = "primary", className?: string) {
  return cn(base, variants[variant], className);
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button type="button" className={buttonClass(variant, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}
