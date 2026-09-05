"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Globe, Lightbulb, Loader2 } from "lucide-react";
import {
  failureAuditResult,
  mapApiResponseToAuditResult,
  saveAuditResult,
  type ApiAuditResponse,
} from "@/lib/audit-storage";

const STEP_DURATION_MS = 1200;
const SUB_MESSAGE_INTERVAL_S = 3;
const TIP_INTERVAL_S = 6;

/** Stage descriptors — what the pipeline is actually doing, not promises. */
const SUB_MESSAGES: Record<number, string[]> = {
  0: [
    "Discovering pages in your sitemap…",
    "Reading robots.txt…",
    "Fetching page HTML…",
  ],
  1: [
    "Checking title tags…",
    "Auditing heading structure…",
    "Reviewing image alt text…",
  ],
  2: [
    "Contacting PageSpeed Insights…",
    "Measuring Core Web Vitals…",
    "Scoring mobile performance…",
  ],
  3: [
    "Compiling findings…",
    "Ranking fixes by impact…",
    "Preparing your report…",
  ],
};

/** Shown after the checklist finishes while the API is still running. */
const WAITING_MESSAGES = [
  "Still fetching live speed data…",
  "PageSpeed can take a little while…",
  "Almost there — thanks for waiting…",
];

/** Educational rotation — gives the wait a purpose. */
const TIPS = [
  "Page titles work best between 30–60 characters, so they display fully in search results.",
  "Meta descriptions don't boost rankings, but a good one earns more clicks — aim for 120–158 characters.",
  "One <h1> per page helps search engines understand your main topic.",
  "Descriptive image alt text helps both screen readers and image search.",
  "A self-referencing canonical tag protects you from duplicate-content issues.",
  "Google rates Largest Contentful Paint under 2.5 seconds as “good”.",
];

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

/** Decorative radar sweep — conveys “actively scanning”. Hidden from AT. */
function ScanVisual() {
  return (
    <div aria-hidden="true" className="relative size-20 shrink-0 sm:size-24">
      <div className="absolute inset-0 rounded-full border-2 border-primary/15" />
      <div className="absolute inset-3 rounded-full border border-primary/15" />
      <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,color-mix(in_srgb,var(--color-primary)_55%,transparent)_45deg,transparent_95deg)] motion-safe:animate-radar-sweep motion-reduce:animate-none" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Globe className="size-5" />
        </span>
      </div>
      <span className="absolute inset-0 rounded-full border-2 border-primary/40 motion-safe:animate-ping-soft motion-reduce:hidden" />
    </div>
  );
}

export function StepProgress({
  steps,
  domain,
}: {
  steps: string[];
  domain?: string;
}) {
  const router = useRouter();
  const [completed, setCompleted] = useState(0);
  const [tick, setTick] = useState(0);
  const [auditFinished, setAuditFinished] = useState<boolean>(() => !domain);
  const redirectedRef = useRef(false);

  // Kick off the real audit the moment the loading screen mounts.
  // The visual steps keep animating on timers so the user sees
  // progress; the redirect waits for BOTH the animation and the API.
  useEffect(() => {
    if (!domain) return;
    // Narrowed to string so the async closure below type-checks.
    const targetDomain: string = domain;
    let cancelled = false;

    async function runAudit() {
      try {
        const res = await fetch("/api/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain: targetDomain }),
        });
        if (!res.ok) {
          throw new Error(`Audit request failed: HTTP ${res.status}`);
        }
        const data = (await res.json()) as ApiAuditResponse;
        if (!data.success) throw new Error("Audit returned an error");
        if (!cancelled) saveAuditResult(mapApiResponseToAuditResult(data));
      } catch (err) {
        // Preserve the actual cause (HTTP status, timeout, network error)
        // so the results page can explain the failure instead of guessing.
        const reason =
          err instanceof Error ? err.message : "Audit request failed";
        if (!cancelled) saveAuditResult(failureAuditResult(targetDomain, reason));
      } finally {
        if (!cancelled) setAuditFinished(true);
      }
    }

    void runAudit();
    return () => {
      cancelled = true;
    };
  }, [domain]);

  useEffect(() => {
    if (completed >= steps.length) return;

    const timer = setTimeout(() => {
      setCompleted((count) => count + 1);
    }, STEP_DURATION_MS);

    return () => clearTimeout(timer);
  }, [completed, steps.length]);

  // 1s heartbeat drives the elapsed timer, sub-status rotation, and tips.
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Redirect once the animation AND the audit are both done. Because
  // auditFinished is state, this re-runs the moment the API resolves —
  // no polling needed.
  useEffect(() => {
    if (completed >= steps.length && auditFinished && !redirectedRef.current) {
      redirectedRef.current = true;
      const timer = setTimeout(() => {
        router.replace("/results");
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [completed, steps.length, auditFinished, router]);

  const percent = Math.round((completed / steps.length) * 100);
  const isWaiting = completed >= steps.length && !auditFinished;
  const isDone = completed >= steps.length && auditFinished;
  const activeStep = completed < steps.length ? steps[completed] : null;

  const headline = isDone
    ? "Done — opening your report"
    : isWaiting
      ? "Still working — fetching live data"
      : (activeStep ?? "Working…");

  const messagePool = isDone
    ? ["Wrapping up…"]
    : isWaiting
      ? WAITING_MESSAGES
      : (SUB_MESSAGES[completed] ?? []);
  const subMessage =
    messagePool.length > 0
      ? messagePool[Math.floor(tick / SUB_MESSAGE_INTERVAL_S) % messagePool.length]
      : null;

  const tip = TIPS[Math.floor(tick / TIP_INTERVAL_S) % TIPS.length];

  return (
    <div className="w-full max-w-xl">
      <div className="flex items-center gap-4 sm:gap-5">
        <ScanVisual />
        <div className="min-w-0 flex-1">
          <p aria-live="polite" className="text-base font-semibold text-foreground sm:text-lg">
            {headline}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {subMessage ? (
              <span
                key={subMessage}
                className="motion-safe:animate-in motion-safe:fade-in-0"
              >
                {subMessage}
              </span>
            ) : null}
          </p>
        </div>
        <p
          className="shrink-0 text-sm tabular-nums text-muted-foreground"
          title="Time elapsed"
        >
          {formatElapsed(tick)}
        </p>
      </div>

      <div
        role="progressbar"
        aria-label="Audit progress"
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-valuenow={completed}
        aria-valuetext={`${completed} of ${steps.length} stages complete — ${headline}`}
        className="mt-5 h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="relative h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        >
          {!isDone && (
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_8px,rgb(255_255_255/0.25)_8px,rgb(255_255_255/0.25)_16px)] motion-safe:animate-bar-stripes motion-reduce:animate-none"
            />
          )}
        </div>
      </div>

      <ol className="mt-6 space-y-3">
        {steps.map((step, index) => {
          const isStepDone = index < completed;
          const isActive = index === completed && !isDone;
          return (
            <li
              key={step}
              aria-current={isActive ? "step" : undefined}
              className="relative flex items-center gap-3 overflow-hidden rounded-xl border border-border bg-card p-4 shadow-card"
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-[linear-gradient(100deg,transparent_20%,rgb(255_255_255/0.28)_50%,transparent_80%)] bg-[length:200%_100%] motion-safe:animate-shimmer-slide motion-reduce:hidden"
                />
              )}
              <span
                aria-hidden="true"
                className={[
                  "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  isStepDone
                    ? "bg-success text-white"
                    : isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                ].join(" ")}
              >
                {isStepDone ? (
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
                  isStepDone
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

      <div className="mt-6 flex items-start gap-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4">
        <Lightbulb aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">
            Good to know
          </p>
          <p
            key={tip}
            className="mt-1 text-sm text-muted-foreground motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1"
          >
            {tip}
          </p>
        </div>
      </div>
    </div>
  );
}
