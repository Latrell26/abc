"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert, RotateCcw, Home } from "lucide-react";

/**
 * Boundary for /audit/loading. The loading screen kicks off the audit
 * fetch on mount — if that segment throws during render, offer a retry
 * that re-mounts the pipeline (same URL) plus an escape hatch home.
 */
export default function AuditLoadingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Audit loading route error:", error);
  }, [error]);

  return (
    <div
      role="alert"
      className="flex max-w-xl flex-col items-start gap-4 motion-safe:animate-in motion-safe:fade-in-0"
    >
      <span className="inline-flex size-11 items-center justify-center rounded-full bg-danger-bg text-danger">
        <TriangleAlert aria-hidden="true" className="size-5" />
      </span>
      <div>
        <p className="inline-block rounded-full bg-muted px-3 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Audit interrupted
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
          The audit screen failed to load
        </h1>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">
          Retrying restarts the loading screen for the same URL — it does not
          lose anything because no audit had finished yet.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          Restart the audit screen
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-card-foreground transition-colors hover:bg-muted"
        >
          <Home aria-hidden="true" className="size-4" />
          Back home
        </Link>
      </div>
    </div>
  );
}
