"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

const STEP_DURATION_MS = 1200;

export function StepProgress({ steps }: { steps: string[] }) {
  const router = useRouter();
  const [completed, setCompleted] = useState(0);

  useEffect(() => {
    if (completed >= steps.length) return;

    const timer = setTimeout(() => {
      setCompleted((count) => count + 1);
    }, STEP_DURATION_MS);

    return () => clearTimeout(timer);
  }, [completed, steps.length]);

  useEffect(() => {
    if (completed >= steps.length) {
      const timer = setTimeout(() => {
        router.replace("/results");
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [completed, steps.length, router]);

  const percent = Math.round((completed / steps.length) * 100);
  const currentStep = completed < steps.length ? steps[completed] : null;

  return (
    <div className="w-full max-w-xl">
      <div
        role="progressbar"
        aria-label="Audit progress"
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-valuenow={completed}
        aria-valuetext={`${completed} of ${steps.length} steps complete`}
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      <ol className="mt-6 space-y-3">
        {steps.map((step, index) => {
          const isDone = index < completed;
          const isActive = index === completed;
          return (
            <li
              key={step}
              aria-current={isActive ? "step" : undefined}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card"
            >
              <span
                aria-hidden="true"
                className={[
                  "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  isDone
                    ? "bg-success text-white"
                    : isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                ].join(" ")}
              >
                {isDone ? (
                  <Check className="size-4" />
                ) : isActive ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={[
                  "text-sm font-medium",
                  isDone
                    ? "text-muted-foreground"
                    : isActive
                      ? "text-card-foreground"
                      : "text-muted-foreground/60",
                ].join(" ")}
              >
                {step}
              </span>
            </li>
          );
        })}
      </ol>

      <p aria-live="polite" className="mt-4 text-sm text-muted-foreground">
        {currentStep ? `Now: ${currentStep}…` : "All done — loading your report."}
      </p>
    </div>
  );
}