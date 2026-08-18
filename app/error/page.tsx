import type { Metadata } from "next";
import {
  Link2,
  Globe,
  Gauge,
  Sparkles,
  RotateCcw,
  Home,
} from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Error states",
};

const failures = [
  {
    icon: Link2,
    title: "Invalid URL",
    text: "The address doesn't look right. The form flags it instantly with a fix-it message.",
    action: "Double-check the URL format — e.g. https://example.com",
  },
  {
    icon: Globe,
    title: "Unreachable site",
    text: "We couldn't connect to the page. The site may be down or blocking automated requests.",
    action: "Try again later, or verify the site loads in your browser.",
  },
  {
    icon: Gauge,
    title: "PageSpeed quota / rate limit",
    text: "The PageSpeed API hit its daily quota or is rate-limiting requests.",
    action: "Wait a bit and retry — the dashboard still renders with the other checks.",
  },
  {
    icon: Sparkles,
    title: "AI failure",
    text: "The summary service didn't respond. Your score and checks are still valid.",
    action: "Re-run the audit, or view the raw checks on the dashboard.",
  },
];

export default function ErrorPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-2 inline-block rounded-full bg-muted px-3 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Error states
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          When something goes wrong
        </h1>
        <p className="mt-2 max-w-prose text-muted-foreground">
          Every failure mode gets a clear message with a retry or next-step
          option, so users are never left staring at a blank screen.
        </p>
      </div>

      <ul className="grid w-full gap-3 sm:grid-cols-2">
        {failures.map((failure) => (
          <li
            key={failure.title}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-card"
          >
            <span className="inline-flex size-9 items-center justify-center rounded-lg bg-danger-bg text-danger">
              <failure.icon aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-card-foreground">
                {failure.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{failure.text}</p>
              <p className="mt-2 text-sm font-medium text-card-foreground">
                {failure.action}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          Run another audit
        </Link>
        <Link
          href="/results"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-card-foreground transition-colors hover:bg-muted"
        >
          <Home aria-hidden="true" className="size-4" />
          View results
        </Link>
      </div>
    </div>
  );
}