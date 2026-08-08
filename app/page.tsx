import type { Metadata } from "next";
import { AuditForm } from "@/components/audit-form";

export const metadata: Metadata = {
  title: "Home",
  description: "Audit any website's SEO health and get plain-language fixes.",
};

export default function HomePage() {
  return (
    <div className="flex flex-col items-start gap-8">
      <div>
        <p className="mb-2 inline-block rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Home
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Audit your website&apos;s SEO
        </h1>
        <p className="mt-3 max-w-prose text-muted-foreground">
          Enter a URL and we&apos;ll scan it for common technical SEO issues,
          pull a page speed score, and explain what to fix in plain language.
        </p>
      </div>

      <AuditForm />

      <div className="grid w-full gap-3 sm:grid-cols-3">
        {[
          "Technical checks: titles, meta, headings, alt text, canonicals",
          "Page speed score from Google PageSpeed Insights",
          "AI summary with prioritized fix recommendations",
        ].map((feature) => (
          <div
            key={feature}
            className="rounded-lg border border-border bg-card p-4 shadow-card"
          >
            <p className="text-sm font-medium text-card-foreground">{feature}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
