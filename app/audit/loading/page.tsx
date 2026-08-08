import type { Metadata } from "next";
import Link from "next/link";
import { PlaceholderPage } from "@/components/page-placeholder";

export const metadata: Metadata = {
  title: "Audit in Progress",
};

const steps = ["Scraping page", "Running technical checks", "Fetching speed score", "Writing AI summary"];

export default function AuditLoadingPage() {
  return (
    <div className="flex flex-col items-start gap-8">
      <PlaceholderPage
        badge="Audit in progress"
        title="Analyzing your website"
        description="The audit runs a sequence of checks before producing your dashboard. This screen shows progress while the pipeline runs."
      />

      <ol className="w-full max-w-xl space-y-3">
        {steps.map((step, index) => (
          <li
            key={step}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-card"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
              {index + 1}
            </span>
            <span className="text-sm font-medium text-card-foreground">
              {step}
            </span>
          </li>
        ))}
      </ol>

      <Link
        href="/"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        ← Back to Home
      </Link>
    </div>
  );
}
