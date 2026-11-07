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
  accent: "bg-accent-soft text-accent",
  blue: "bg-accent-soft text-accent",
  dark: "bg-[#0c192c] text-white shadow-xs",
  navy: "bg-[#0c192c] text-white shadow-xs",
  gold: "bg-amber-500/10 text-amber-600 border border-amber-500/20",
  good: "bg-good-soft text-good",
  emerald: "bg-good-soft text-good",
  danger: "bg-danger-soft text-danger",
  rose: "bg-danger-soft text-danger",
  teal: "bg-teal-soft text-teal",
  sky: "bg-teal-soft text-teal",
  warning: "bg-warning-soft text-warning",
  amber: "bg-warning-soft text-warning",
  purple: "bg-purple-soft text-purple",
  neutral: "bg-card-subtle text-ink-secondary border border-hairline",
  grey: "bg-hairline text-ink-secondary",
};

const sizeStyles: Record<IconBadgeSize, { container: string; iconSize: number }> = {
  sm: { container: "size-7 rounded-lg", iconSize: 14 },
  md: { container: "size-9 rounded-xl", iconSize: 17 }, // 36px Signature Squircle
  lg: { container: "size-11 rounded-2xl", iconSize: 21 },
  hero: { container: "size-14 rounded-2xl", iconSize: 26 },
};

/**
 * Signature squircle icon container matching the Icon Design System.
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
