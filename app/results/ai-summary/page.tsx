"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CircleAlert,
  Info,
} from "lucide-react";
import { Chat } from "@/components/chat";
import {
  type Recommendation,
} from "@/lib/audit-types";
import {
  getAuditSnapshot,
  subscribeAuditStorage,
} from "@/lib/audit-storage";
import { cn } from "@/lib/utils";

const severityMeta: Record<
  Recommendation["severity"],
  { label: string; icon: typeof AlertTriangle; badge: string; iconColor: string }
> = {
  high: {
    label: "High priority",
    icon: CircleAlert,
    badge: "bg-danger-bg text-danger",
    iconColor: "text-danger",
  },
  medium: {
    label: "Medium priority",
    icon: AlertTriangle,
    badge: "bg-warning-bg text-warning",
    iconColor: "text-warning",
  },
  low: {
    label: "Low priority",
    icon: Info,
    badge: "bg-muted text-muted-foreground",
    iconColor: "text-muted-foreground",
  },
};

function RecommendationCard({
  recommendation,
  index,
}: {
  recommendation: Recommendation;
  index: number;
}) {
  const meta = severityMeta[recommendation.severity];
  const Icon = meta.icon;

  return (
    <article className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-card-foreground">
          {index + 1}. {recommendation.title}
        </h3>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
            meta.badge
          )}
        >
          <Icon aria-hidden="true" className="size-3.5" />
          {meta.label}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{recommendation.body}</p>
      <div className="mt-3 flex items-start gap-2 rounded-lg bg-muted p-3">
        <ArrowRight aria-hidden="true" className={cn("mt-0.5 size-4 shrink-0", meta.iconColor)} />
        <p className="text-sm font-medium text-card-foreground">
          {recommendation.action}
        </p>
      </div>
    </article>
  );
}

export default function AiSummaryPage() {
  // Tri-state like the dashboard: undefined = loading, null = no audit
  // stored (empty state, chat hidden), AuditResult = render normally.
  // Read synchronously via useSyncExternalStore so navigation paints the
  // current audit on the first frame — the chat (keyed by audit.url)
  // always mounts against fresh data, never a stale previous run.
  const audit = useSyncExternalStore(
    subscribeAuditStorage,
    getAuditSnapshot,
    () => undefined
  );

  if (audit === undefined) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading AI summary">
        <div className="h-8 w-56 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (audit === null) {
    return (
      <div className="flex flex-col items-center gap-6 py-12 text-center">
        <p className="mb-2 inline-block rounded-full bg-muted px-3 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          No audit yet
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Nothing to summarize yet
        </h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          Run an SEO audit first — then the assistant can explain your results
          in plain language and tell you what to fix.
        </p>
        <Link
          href="/"
          className="px-4 py-2 rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Run an audit
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="summary-heading">
        <p className="mb-2 inline-block rounded-full bg-muted px-3 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          AI summary panel
        </p>
        <h1
          id="summary-heading"
          className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
        >
          What your results mean
        </h1>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">
          Ask anything about the audit for {audit.url} — the assistant
          answers in plain language.
        </p>
      </section>

      {/*
        Keyed by audit domain: a new audit mounts a brand-new Chat, so
        neither in-memory messages nor the persisted conversation from a
        previous site can leak into the new summary.
      */}
      <Chat key={audit.url} audit={audit} />

      <section aria-labelledby="fixes-heading">
        <h2
          id="fixes-heading"
          className="text-lg font-semibold tracking-tight text-foreground"
        >
          What to fix, in order
        </h2>
        {audit.recommendations.length > 0 ? (
          <div className="mt-4 space-y-3">
            {audit.recommendations.map((recommendation, index) => (
              <RecommendationCard
                key={recommendation.id}
                recommendation={recommendation}
                index={index}
              />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            No recommendations yet — run an audit first, or all checks passed.
          </p>
        )}
      </section>
    </div>
  );
}