import type { Metadata } from "next";
import Link from "next/link";
import { StepProgress } from "@/components/step-progress";

export const metadata: Metadata = {
  title: "Audit in Progress",
};

const steps = [
  "Scraping page",
  "Running technical checks",
  "Fetching speed score",
  "Compiling your report",
];

export default async function AuditLoadingPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;

  return (
    <div className="flex flex-col items-start gap-6">
      <div>
        <p className="mb-2 inline-block rounded-full bg-muted px-3 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Audit in progress
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Analyzing your website
        </h1>
        {url ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Running a full SEO audit on{" "}
            <span className="font-medium text-foreground">{url}</span>
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Most audits take 15–60 seconds depending on the size of the
            site — we check every page we can find.
          </p>
        )}
      </div>

      <StepProgress steps={steps} domain={url} />

      <Link
        href="/"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        ← Back to Home
      </Link>
    </div>
  );
}