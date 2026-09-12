"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert, RotateCcw, LayoutDashboard } from "lucide-react";

/**
 * Boundary for /results and /results/ai-summary. A render failure here
 * must never nuke the saved audit — reset re-renders the dashboard
 * against the same sessionStorage data.
 */
export default function ResultsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Results route error:", error);
  }, [error]);

  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-4 py-12 text-center motion-safe:animate-in motion-safe:fade-in-0"
    >
      <span className="inline-flex size-11 items-center justify-center rounded-full bg-danger-bg text-danger">
        <TriangleAlert aria-hidden="true" className="size-5" />
      </span>
      <div>
        <p className="inline-block rounded-full bg-muted px-3 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Results failed to render
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
          Your audit data is safe
        </h1>
        <p className="mx-auto mt-2 max-w-prose text-sm text-muted-foreground">
          The dashboard hit a rendering error. Retrying re-renders this view
          from the saved audit in this tab — it does not re-run the audit or
          clear your chat.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          Re-render results
        </button>
        <Link
          href="/results"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-card-foreground transition-colors hover:bg-muted"
        >
          <LayoutDashboard aria-hidden="true" className="size-4" />
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
