import type { Metadata } from "next";
import {
  AlertTriangle,
  ArrowRight,
  CircleAlert,
  Info,
} from "lucide-react";
import { Chat } from "@/components/chat";
import { mockAudit, type Recommendation } from "@/lib/mock-audit";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "AI Summary",
};

export const dynamic = "force-dynamic";

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
          Ask anything about the audit for {mockAudit.url} — the assistant
          answers in plain language.
        </p>
      </section>

      <Chat />

      <section aria-labelledby="fixes-heading">
        <h2
          id="fixes-heading"
          className="text-lg font-semibold tracking-tight text-foreground"
        >
          What to fix, in order
        </h2>
        <div className="mt-4 space-y-3">
          {mockAudit.recommendations.map((recommendation, index) => (
            <RecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              index={index}
            />
          ))}
        </div>
      </section>
    </div>
  );
}