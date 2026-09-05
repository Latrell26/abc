import { scoreTone } from "@/lib/audit-types";

const toneColors = {
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger: "var(--color-danger)",
} as const;

const toneLabels = {
  success: "Good",
  warning: "Needs improvement",
  danger: "Poor",
} as const;

const toneText = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
} as const;

export function ScoreGauge({
  value,
  label,
  size = 160,
}: {
  value: number;
  label: string;
  size?: number;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const tone = scoreTone(clamped);
  const strokeWidth = Math.round(size * 0.07);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="flex flex-col items-center gap-2"
      role="img"
      aria-label={`${label}: ${clamped} out of 100, ${toneLabels[tone]}`}
    >
      <div className="relative" aria-hidden="true">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className="stroke-muted"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            stroke={toneColors[tone]}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-4xl font-bold tabular-nums ${toneText[tone]}`}>
            {clamped}
          </span>
        </div>
      </div>
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
    </div>
  );
}