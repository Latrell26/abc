"use client";

import Link from "next/link";
import { TriangleAlert, RotateCcw, Home } from "lucide-react";

/**
 * Last-resort boundary for errors inside the root layout itself.
 * Must render its own <html>/<body> — no access to layout components.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen min-h-dvh flex-col items-center justify-center px-4">
        <div
          role="alert"
          className="flex w-full max-w-md flex-col items-center gap-4 text-center"
        >
          <span className="inline-flex size-11 items-center justify-center rounded-full bg-danger-bg text-danger">
            <TriangleAlert aria-hidden="true" className="size-5" />
          </span>
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            The app hit an unexpected error. Retrying reloads only the failed
            section.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              Try again
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium"
            >
              <Home aria-hidden="true" className="size-4" />
              Go home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
