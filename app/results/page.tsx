import type { Metadata } from "next";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Gauge,
  ListChecks,
} from "lucide-react";
import { ScoreGauge } from "@/components/score-gauge";
import { SpeedChart } from "@/components/speed-chart";
import {
  mockAudit,
  scoreTone,
  type CheckStatus,
} from "@/lib/mock-audit";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Results",
};

const statusMeta: Record<
  CheckStatus,
  { label: string; icon: typeof CheckCircle2; text: string; bg: string }
> = {
  pass: {
    label: "Pass",
    icon: CheckCircle2,
    text: "text-success",
    bg: "bg-success-bg",
  },
  partial: {
    label: "Partial",
    icon: AlertTriangle,
    text: "text-warning",
    bg: "bg-warning-bg",
  },
  fail: {
    label: "Fail",
    icon: XCircle,
    text: "text-danger",
    bg: "bg-danger-bg",
  },
};

function StatusPill({ status }: { status: CheckStatus }) {
  const meta = statusMeta[status];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        meta.bg,
        meta.text
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {meta.label}
    </span>
  );
}

function CheckCard({
  check,
}: {
  check: (typeof mockAudit.checks)[number];
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-card-foreground">
          {check.label}
        </h3>
        <StatusPill status={check.status} />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{check.verdict}</p>
      {check.details.length > 0 ? (
        <details className="group mt-3">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary">
            <span aria-hidden="true" className="transition-transform group-open:rotate-90">
              ›
            </span>
            Show details
          </summary>
          <ul className="mt-2 space-y-1.5 border-l-2 border-border pl-3">
            {check.details.map((detail) => (
              <li key={detail} className="text-sm text-muted-foreground">
                {detail}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

export default function ResultsPage() {
  const passed = mockAudit.checks.filter((c) => c.status === "pass").length;

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="score-heading">
        <p className="mb-2 inline-block rounded-full bg-muted px-3 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Results dashboard
        </p>
        <h1 id="score-heading" className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Your SEO report
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Audit of <span className="font-medium text-foreground">{mockAudit.url}</span> —{" "}
          {new Date().toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>

        <div className="mt-6 grid w-full gap-3 lg:grid-cols-3">
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card p-6 shadow-card lg:col-span-1">
            <div className="flex items-center justify-center">
              <ScoreGauge value={mockAudit.overallScore} label="Overall SEO" />
            </div>
            <p className="max-w-[16rem] text-center text-sm text-muted-foreground">
              {scoreTone(mockAudit.overallScore) === "success"
                ? "Solid fundamentals — your site is in good shape."
                : scoreTone(mockAudit.overallScore) === "warning"
                  ? "You're on the right track, but a few fixes will move the needle."
                  : "Several issues are holding your site back in search results."}
            </p>
          </div>

          <div className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-6 shadow-card lg:col-span-2">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ListChecks aria-hidden="true" className="size-5" />
              </span>
              <h2 className="text-sm font-semibold text-card-foreground">
                Check results
              </h2>
            </div>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-muted p-4">
                <dt className="text-xs font-medium text-muted-foreground">Checks passed</dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums text-success">
                  {passed}
                  <span className="text-sm font-medium text-muted-foreground">
                    {" "}
                    / {mockAudit.checks.length}
                  </span>
                </dd>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <dt className="text-xs font-medium text-muted-foreground">Speed score</dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums text-warning">
                  {mockAudit.pageSpeedScore}
                  <span className="text-sm font-medium text-muted-foreground"> / 100</span>
                </dd>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <dt className="text-xs font-medium text-muted-foreground">Needs attention</dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums text-danger">
                  {mockAudit.checks.filter((c) => c.status !== "pass").length}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section aria-labelledby="checks-heading">
        <h2 id="checks-heading" className="text-lg font-semibold tracking-tight text-foreground">
          Technical checks
        </h2>
        <div className="mt-4 grid w-full gap-3 sm:grid-cols-2">
          {mockAudit.checks.map((check) => (
            <CheckCard key={check.id} check={check} />
          ))}
        </div>
      </section>

      <section aria-labelledby="speed-heading" className="rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Gauge aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 id="speed-heading" className="text-sm font-semibold text-card-foreground">
              Page speed
            </h2>
            <p className="text-xs text-muted-foreground">
              Lab metrics from Google PageSpeed Insights
            </p>
          </div>
        </div>
        <div className="mt-6 grid w-full gap-6 lg:grid-cols-[auto_1fr] lg:items-center">
          <div className="flex items-center justify-center lg:px-4">
            <ScoreGauge value={mockAudit.pageSpeedScore} label="Performance" size={140} />
          </div>
          <SpeedChart metrics={mockAudit.psiMetrics} />
        </div>
      </section>
    </div>
  );
}