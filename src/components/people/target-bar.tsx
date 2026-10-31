import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/format";

/**
 * Progress toward a monthly target. The thin mark shows how much of the month has gone,
 * so "behind" is visible at a glance: green when ahead of the mark, amber when behind.
 */
export function TargetBar({ label, actual, target, elapsed }: { label: string; actual: number; target: number; elapsed: number }) {
  const share = target > 0 ? actual / target : 0;
  const onTrack = share >= elapsed;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="text-ink-secondary">{label}</span>
        <span className="tabular-nums text-ink">
          <span className="font-semibold">{formatINR(actual)}</span> of {formatINR(target)}
        </span>
      </div>
      <div className="relative mt-1.5 h-2.5 overflow-hidden rounded-full bg-hairline" role="img" aria-label={`${Math.round(share * 100)}% of target, ${Math.round(elapsed * 100)}% of the month gone`}>
        <div className={cn("h-full rounded-full", onTrack ? "bg-good" : "bg-warning")} style={{ width: `${Math.min(100, share * 100)}%` }} />
        <div className="absolute inset-y-0 w-0.5 bg-ink/50" style={{ left: `${elapsed * 100}%` }} />
      </div>
      <p className={cn("mt-1 text-[12px]", onTrack ? "text-good" : "text-warning")}>
        {Math.round(share * 100)}% done · {onTrack ? "on track" : `behind; ${formatINR(Math.max(0, target - actual))} to go`}
      </p>
    </div>
  );
}
