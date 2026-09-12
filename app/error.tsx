"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert, RotateCcw, Home } from "lucide-react";

/**
 * Root error boundary for the whole app (Next.js `app/error.tsx`).
 * Catches render-time failures in any route segment without its own
 * boundary. Calm entry (fade-in, no red flash-bang); retry re-runs only
 * the failed segment via `reset`, never a full page reload.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Visible in Vercel logs / DevTools; never shown to the user.
    console.error("App route error:", error);
  }, [error]);

  return (
    <div
      role="alert"
      className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 py-12 text-center motion-safe:animate-in motion-safe:fade-in-0"
    >
      <span className="inline-flex size-11 items-center justify-center rounded-full bg-danger-bg text-danger">
        <TriangleAlert aria-hidden="true" className="size-5" />
      </span>
      <div>
        <p className="inline-block rounded-full bg-muted px-3 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Something went wrong
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
          This page couldn&apos;t load
        </h1>
        <p className="mx-auto mt-2 max-w-prose text-sm text-muted-foreground">
          The failed section stopped before it could finish rendering — your
          last audit is still saved in this tab. Retrying re-renders only this
          section, not the whole audit.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          Try this section again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-card-foreground transition-colors hover:bg-muted"
        >
          <Home aria-hidden="true" className="size-4" />
          Go home
        </Link>
      </div>
    </div>
  );
}
