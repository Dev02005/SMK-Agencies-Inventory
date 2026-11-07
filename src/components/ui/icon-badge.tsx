import type { LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type IconBadgeTone =
  | "accent"
  | "blue"
  | "dark"
  | "navy"
  | "gold"
  | "good"
  | "emerald"
  | "danger"
  | "rose"
  | "teal"
  | "sky"
  | "warning"
  | "amber"
  | "purple"
  | "neutral"
  | "grey";

export type IconBadgeSize = "sm" | "md" | "lg" | "hero";

const toneStyles: Record<IconBadgeTone, string> = {
  gold: "bg-gold-50 text-gold-600 border border-gold-200/60",
  dark: "bg-ink-900 text-gold-300 shadow-xs",
  navy: "bg-ink-900 text-gold-300 shadow-xs",
  emerald: "bg-emerald-50 text-emerald-600 border border-emerald-200/60",
  good: "bg-emerald-50 text-emerald-600 border border-emerald-200/60",
  rose: "bg-rose-50 text-rose-600 border border-rose-200/60",
  danger: "bg-rose-50 text-rose-600 border border-rose-200/60",
  sky: "bg-sky-50 text-sky-600 border border-sky-200/60",
  blue: "bg-sky-50 text-sky-600 border border-sky-200/60",
  accent: "bg-accent-soft text-accent border border-accent/20",
  amber: "bg-amber-50 text-amber-600 border border-amber-200/60",
  warning: "bg-amber-50 text-amber-600 border border-amber-200/60",
  teal: "bg-teal-soft text-teal border border-teal-200/60",
  purple: "bg-purple-soft text-purple border border-purple-200/60",
  neutral: "bg-card-subtle text-ink-secondary border border-hairline",
  grey: "bg-hairline text-ink-secondary",
};

const sizeStyles: Record<IconBadgeSize, { container: string; iconSize: number }> = {
  sm: { container: "h-7 w-7 rounded-lg", iconSize: 14 },
  md: { container: "h-9 w-9 rounded-xl", iconSize: 17 }, // 36px Signature Squircle
  lg: { container: "h-11 w-11 rounded-2xl", iconSize: 21 },
  hero: { container: "h-14 w-14 rounded-2xl", iconSize: 24 },
};

/**
 * Signature squircle icon container matching the Icon Design System (ICON_STYLES.md).
 */
export function IconBadge({
  icon: Icon,
  tone = "accent",
  size = "md",
  className,
  strokeWidth = 2,
  ...props
}: {
  icon: LucideIcon;
  tone?: IconBadgeTone;
  size?: IconBadgeSize;
  strokeWidth?: number;
} & ComponentProps<"div">) {
  const { container, iconSize } = sizeStyles[size];
  return (
    <div
      className={cn("grid place-items-center shrink-0 transition-all", container, toneStyles[tone], className)}
      {...props}
    >
      <Icon size={iconSize} strokeWidth={strokeWidth} aria-hidden />
    </div>
  );
}

export function iconBadgeClass(tone: IconBadgeTone = "accent", size: IconBadgeSize = "md", className?: string) {
  return cn("grid place-items-center shrink-0 transition-all", sizeStyles[size].container, toneStyles[tone], className);
}

/**
 * Exact signature squircles from ICON_STYLES.md Section 3.
 */
export function Squircle({
  icon: Icon,
  variant = "gold",
  size = 17,
  className,
}: {
  icon: LucideIcon;
  variant?: "gold" | "dark" | "emerald" | "rose" | "sky" | "amber";
  size?: number;
  className?: string;
}) {
  const variantStyles: Record<string, string> = {
    gold: "bg-gold-50 text-gold-600",
    dark: "bg-ink-900 text-gold-300",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
    sky: "bg-sky-50 text-sky-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <div className={cn("grid h-9 w-9 place-items-center rounded-xl", variantStyles[variant], className)}>
      <Icon size={size} />
    </div>
  );
}
