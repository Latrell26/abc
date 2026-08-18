import type { Metadata } from "next";
import { Gauge, ListChecks, Sparkles, FileText, Heading1, Image, Link2 } from "lucide-react";
import { AuditForm } from "@/components/audit-form";

export const metadata: Metadata = {
  title: "Home",
  description: "Audit any website's SEO health and get plain-language fixes.",
};

const steps = [
  {
    icon: ListChecks,
    title: "Scan",
    text: "We crawl your page for technical SEO issues — titles, meta, headings, alt text, canonicals, robots.txt, and sitemap.",
  },
  {
    icon: Gauge,
    title: "Score",
    text: "Google PageSpeed Insights grades your speed, and a rule-based engine turns every check into an overall 0–100 score.",
  },
  {
    icon: Sparkles,
    title: "Explain",
    text: "Our AI assistant summarizes the top issues and answers your follow-up questions — in plain language, no jargon.",
  },
];

const checks = [
  { icon: FileText, label: "Title & meta tags" },
  { icon: Heading1, label: "Heading structure" },
  { icon: Image, label: "Alt text" },
  { icon: Link2, label: "Canonical tags" },
  { icon: FileText, label: "robots.txt & sitemap" },
  { icon: Gauge, label: "Page speed" },
];

export default function HomePage() {
  return (
    <div className="flex flex-col items-center gap-12">
      <section className="flex w-full max-w-3xl flex-col items-center gap-6 py-10 text-center">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold tracking-wide text-primary uppercase">
          AI-powered SEO audits
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Audit your website&apos;s SEO
        </h1>
        <p className="max-w-prose text-lg text-muted-foreground">
          Scan your site for common technical SEO issues, get a page speed
          score, and see what to fix — explained in plain language.
        </p>
        <div className="w-full max-w-xl">
          <AuditForm />
        </div>
        <p className="text-sm text-muted-foreground">
          Free and instant — no sign-up needed.
        </p>
      </section>

      <section
        aria-labelledby="how-it-works-heading"
        className="w-full max-w-5xl"
      >
        <h2
          id="how-it-works-heading"
          className="text-center text-sm font-semibold tracking-wide text-muted-foreground uppercase"
        >
          How it works
        </h2>
        <ol className="mt-6 grid w-full gap-3 sm:grid-cols-3">
          {steps.map((step) => (
            <li
              key={step.title}
              className="flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-5 shadow-card"
            >
              <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <step.icon aria-hidden="true" className="size-5" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-card-foreground">
                  {step.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="checks-heading" className="w-full max-w-5xl">
        <h2
          id="checks-heading"
          className="text-center text-sm font-semibold tracking-wide text-muted-foreground uppercase"
        >
          What we check
        </h2>
        <ul className="mt-6 grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {checks.map((check) => (
            <li
              key={check.label}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card"
            >
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <check.icon aria-hidden="true" className="size-4" />
              </span>
              <p className="text-sm font-medium text-card-foreground">
                {check.label}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}