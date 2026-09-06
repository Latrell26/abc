"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  scoreTone,
  type AuditCheck,
  type CheckStatus,
} from "@/lib/audit-types";
import {
  getAuditSnapshot,
  subscribeAuditStorage,
} from "@/lib/audit-storage";import { cn } from "@/lib/utils";

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
  check: AuditCheck;
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
  // Real audit data stored by the loading screen, read synchronously via
  // useSyncExternalStore so client-side navigation paints the dashboard on
  // the very first frame — no skeleton flash, no stale-data flicker.
  // Tri-state: undefined = SSR/loading (skeleton), null = no audit stored
  // (empty state with CTA), AuditResult = render the dashboard.
  // The store notifies on every save/clear (plus cross-tab changes), so
  // the page always shows the latest audit without re-read effects.
  const audit = useSyncExternalStore(
    subscribeAuditStorage,
    getAuditSnapshot,
    () => undefined
  );
  const router = useRouter();

  if (audit === undefined) {
    return (
      <div className="flex flex-col gap-8" aria-busy="true" aria-label="Loading audit results">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="grid w-full gap-3 lg:grid-cols-3">
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
          <div className="h-64 animate-pulse rounded-xl bg-muted lg:col-span-2" />
        </div>
        <div className="grid w-full gap-3 sm:grid-cols-2">
          <div className="h-32 animate-pulse rounded-xl bg-muted" />
          <div className="h-32 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  if (audit === null) {
    return (
      <div className="flex flex-col items-center gap-8 py-12 text-center">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold tracking-wide text-primary uppercase">
          No audit yet
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Run your first SEO audit
        </h1>
        <p className="max-w-prose text-lg text-muted-foreground">
          There are no audit results to show. Enter your website URL on the
          home page and we will check its SEO health, speed, and what to fix.
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="px-4 py-2 rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Run an audit
          </Link>
        </div>
      </div>
    );
  }

  const pipelineFailed = audit.overallScore === -1;
  const passed = audit.checks.filter((c) => c.status === "pass").length;
  const totalChecks = audit.checks.length;
  const failedChecks = audit.checks.filter((c) => c.status === "fail").length;
  const partialChecks = audit.checks.filter(
    (c) => c.status === "partial"
  ).length;
  const totalPages = audit.totalPages ?? 1;
  // Pages that never produced results, with the actual reason each one
  // failed (HTTP status, fetch timeout, server time-budget skip).
  const failedPages = (audit.pages ?? []).filter((p) => p.status !== "success");
  // Full per-page breakdown (successes and failures alike) for the
  // "Pages audited" table — so users see every discovered page, not just
  // the ones that failed.
  const allPages = audit.pages ?? [];
  const auditedPages = allPages.filter((p) => p.status === "success");
  const speedMeasuredPages = auditedPages.filter(
    (p) => p.pageSpeedScore >= 0
  ).length;

  if (pipelineFailed) {
    return (
      <div className="flex flex-col items-center gap-8 py-12">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold tracking-wide text-primary uppercase">
          Audit failed
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          SEO Audit Total Failure
        </h1>
        <p className="max-w-prose text-center text-lg text-muted-foreground">
          {audit.failureReason ??
            "Unfortunately, we were not able to complete the audit of this page."}
        </p>
        <p className="max-w-prose text-center text-sm text-muted-foreground">
          This can happen if the site is unreachable, the robots.txt or sitemap.xml cannot
          be found, or Google PageSpeed Insights quota has been exhausted.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="px-4 py-2 rounded-md border border-primary text-sm font-medium text-primary hover:bg-primary/10"
          >
            Retry Audit
          </button>
          <Link
            href="/"
            className="px-4 py-2 rounded-md border border-border text-sm font-medium text-foreground hover:bg-muted/50"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  if (totalPages === 1) {
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
            Audit of <span className="font-medium text-foreground">
              {audit.url}
            </span> —{" "}
            {new Date().toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <p className="mt-2 text-sm text-warning">
            <strong>Audited 1 page only</strong> — results reflect this single page. For
            a full site audit, add more URLs or check that sitemap.xml is accessible.
          </p>

          <div className="mt-6 grid w-full gap-3 lg:grid-cols-3">
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card p-6 shadow-card lg:col-span-1">
              <div className="flex items-center justify-center">
                <ScoreGauge value={audit.overallScore} label="Overall SEO" />
              </div>
              <p className="max-w-[16rem] text-center text-sm text-muted-foreground">
                {scoreTone(audit.overallScore) === "success"
                  ? "Solid fundamentals — your site is in good shape."
                  : scoreTone(audit.overallScore) === "warning"
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
                      / {totalChecks}
                    </span>
                  </dd>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <dt className="text-xs font-medium text-muted-foreground">Speed score</dt>
                  <dd className="mt-1 text-2xl font-bold tabular-nums text-warning">
                    {audit.pageSpeedScore >= 0 ? (
                      <>
                        {audit.pageSpeedScore}
                        <span className="text-sm font-medium text-muted-foreground"> / 100</span>
                      </>
                    ) : (
                      <span className="text-lg font-semibold">N/A</span>
                    )}
                  </dd>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <dt className="text-xs font-medium text-muted-foreground">Needs attention</dt>
                  <dd className="mt-1 text-2xl font-bold tabular-nums text-danger">
                    {failedChecks + partialChecks}
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
            {audit.checks.map((check) => (
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
              {audit.pageSpeedScore === -1 && audit.pageSpeedError ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Speed not measured on the server — {audit.pageSpeedError}.
                </p>
              ) : null}
            </div>
          </div>
          <div className="mt-6 grid w-full gap-6 lg:grid-cols-[auto_1fr] lg:items-center">
            <div className="flex items-center justify-center lg:px-4">
              <ScoreGauge value={audit.pageSpeedScore} label="Performance" size={140} />
            </div>
            <SpeedChart metrics={audit.psiMetrics} />
          </div>
        </section>
      </div>
    );
  }

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
          Audit of <span className="font-medium text-foreground">{audit.url}</span> —{" "}
          {totalPages} page{totalPages === 1 ? "" : "s"} —{" "}
          {new Date().toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>

        {failedPages.length > 0 && (
          <div
            role="note"
            aria-label="Pages that could not be audited"
            className="mt-4 rounded-xl border border-warning/30 bg-warning-bg p-4"
          >
            <p className="text-sm font-semibold text-warning">
              {failedPages.length} of {totalPages} page
              {totalPages === 1 ? "" : "s"} could not be audited — scores
              reflect the pages that completed.
            </p>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {failedPages.slice(0, 4).map((page) => (
                <li key={page.url} className="break-all">
                  <span className="font-medium">{page.url}</span>
                  {page.error ? ` — ${page.error}` : ""}
                </li>
              ))}
              {failedPages.length > 4 && (
                <li>…and {failedPages.length - 4} more.</li>
              )}
            </ul>
          </div>
        )}

        {allPages.length > 0 ? (
          <section
            aria-labelledby="pages-heading"
            className="mt-6 rounded-xl border border-border bg-card shadow-card"
          >
            <div className="p-6 pb-3">
              <h2
                id="pages-heading"
                className="text-sm font-semibold text-card-foreground"
              >
                Pages audited — {auditedPages.length} of {totalPages}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Every discovered page with its per-page result — speed
                measured on {speedMeasuredPages} of {auditedPages.length}.
              </p>
            </div>
            <div className="overflow-x-auto px-6 pb-6">
              <table className="w-full min-w-[38rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Page
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Overall
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Speed
                    </th>
                    <th scope="col" className="py-2 font-medium">
                      Note
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {allPages.map((page) => {
                    const checkValues = Object.values(page.checks ?? {});
                    const passedCount = checkValues.filter(
                      (s) => s === "pass"
                    ).length;
                    return (
                      <tr
                        key={page.url}
                        className="border-b border-border/60 last:border-0"
                      >
                        <td className="py-2.5 pr-4 font-medium break-all text-card-foreground">
                          {page.url}
                        </td>
                        <td className="py-2.5 pr-4 tabular-nums text-card-foreground">
                          {page.overallScore >= 0 ? page.overallScore : "—"}
                        </td>
                        <td className="py-2.5 pr-4 tabular-nums text-card-foreground">
                          {page.pageSpeedScore >= 0
                            ? page.pageSpeedScore
                            : "N/A"}
                        </td>
                        <td className="py-2.5 text-muted-foreground">
                          {page.status !== "success"
                            ? (page.error ?? "Audit failed")
                            : page.pageSpeedScore < 0
                              ? (page.psiError ?? "Speed not measured")
                              : checkValues.length > 0
                                ? `${passedCount}/${checkValues.length} checks pass`
                                : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <div className="mt-6 grid w-full gap-3 lg:grid-cols-3">
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card p-6 shadow-card lg:col-span-1">
            <div className="flex items-center justify-center">
              <ScoreGauge value={audit.overallScore} label="Overall SEO" />
            </div>
            <p className="max-w-[16rem] text-center text-sm text-muted-foreground">
              {scoreTone(audit.overallScore) === "success"
                ? "Solid fundamentals — your site is in good shape."
                : scoreTone(audit.overallScore) === "warning"
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
                    / {totalChecks}
                  </span>
                </dd>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <dt className="text-xs font-medium text-muted-foreground">Speed score</dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums text-warning">
                  {audit.pageSpeedScore}
                  <span className="text-sm font-medium text-muted-foreground"> / 100</span>
                </dd>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <dt className="text-xs font-medium text-muted-foreground">Needs attention</dt>
                <dd className="mt-1 text-2xl font-bold tabular-nums text-danger">
                  {failedChecks + partialChecks}
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
          {audit.checks.map((check) => (
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
            {auditedPages.length > 0 &&
            speedMeasuredPages < auditedPages.length ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Speed measured on {speedMeasuredPages} of{" "}
                {auditedPages.length}{" "}
                {auditedPages.length === 1 ? "page" : "pages"} — the remaining
                PageSpeed calls were skipped as the server time budget ran
                out.
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-6 grid w-full gap-6 lg:grid-cols-[auto_1fr] lg:items-center">
          <div className="flex items-center justify-center lg:px-4">
            <ScoreGauge value={audit.pageSpeedScore} label="Performance" size={140} />
          </div>
          <SpeedChart metrics={audit.psiMetrics} />
        </div>
      </section>
    </div>
  );
}