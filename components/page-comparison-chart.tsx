"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Trophy } from "lucide-react";
import type {
  ComparePagesMetric,
  ComparePagesOutput,
} from "@/lib/ai/compare-pages.tool";
import { scoreTone } from "@/lib/audit-types";
import { cn } from "@/lib/utils";

export const METRIC_LABELS: Record<ComparePagesMetric, string> = {
  score: "Overall score",
  pageSpeed: "Page speed score",
  titleTag: "Title tag issues",
  metaDescription: "Meta description issues",
  headingStructure: "Heading structure issues",
  altText: "Image alt text issues",
  canonicalTag: "Canonical tag issues",
};

function shortUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path =
      parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/$/, "");
    const label = `${parsed.hostname}${path}`;
    return label.length > 34 ? `${label.slice(0, 33)}…` : label;
  } catch {
    return url.length > 34 ? `${url.slice(0, 33)}…` : url;
  }
}

function barColor(value: number, isNumeric: boolean): string {
  if (!isNumeric) return "var(--color-warning)";
  const tone = scoreTone(Math.max(0, value));
  if (tone === "success") return "var(--color-success)";
  if (tone === "warning") return "var(--color-warning)";
  return "var(--color-danger)";
}

/**
 * Renders a `comparePages` tool result as a real component: a horizontal
 * bar chart of the ranked pages plus best/worst captions. Used for the
 * tool part's `output-available` state — never a JSON dump.
 */
export function PageComparisonChart({
  output,
}: {
  output: ComparePagesOutput;
}) {
  const isNumeric = output.metric === "score" || output.metric === "pageSpeed";
  const data = output.ranking.map((entry) => ({
    label: shortUrl(entry.url),
    fullUrl: entry.url,
    value: entry.value,
    fill: barColor(entry.value, isNumeric),
  }));

  return (
    <figure
      aria-labelledby={`compare-${output.metric}`}
      className="w-full rounded-xl border border-border bg-background p-3"
    >
      <figcaption
        id={`compare-${output.metric}`}
        className="flex items-center gap-1.5 text-xs font-semibold text-foreground"
      >
        <Trophy aria-hidden="true" className="size-3.5 text-primary" />
        Pages by {METRIC_LABELS[output.metric]}
      </figcaption>
      <div
        className="mt-1 h-44 w-full"
        role="img"
        aria-label={`Bar chart comparing ${data.length} pages by ${METRIC_LABELS[output.metric]}. Best: ${shortUrl(output.bestUrl)}. Worst: ${shortUrl(output.worstUrl)}.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 36, bottom: 4, left: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              domain={isNumeric ? [0, 100] : [0, "dataMax"]}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={110}
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "var(--color-muted)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as {
                  fullUrl: string;
                  value: number;
                };
                return (
                  <div className="max-w-64 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs shadow-card">
                    <p className="font-medium break-all text-card-foreground">
                      {row.fullUrl}
                    </p>
                    <p className="text-muted-foreground">
                      {isNumeric
                        ? `Score: ${row.value}/100`
                        : `Issues: ${row.value}`}
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
              {data.map((entry) => (
                <Cell key={entry.fullUrl} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <p className="text-muted-foreground">
          Best:{" "}
          <span className={cn("font-medium text-success")}>
            {shortUrl(output.bestUrl)}
          </span>
        </p>
        <p className="text-muted-foreground">
          Worst:{" "}
          <span className={cn("font-medium text-danger")}>
            {shortUrl(output.worstUrl)}
          </span>
        </p>
        {output.skippedCount > 0 && (
          <p className="text-muted-foreground">
            {output.skippedCount} page{output.skippedCount === 1 ? "" : "s"}{" "}
            skipped (failed to audit)
          </p>
        )}
      </div>
    </figure>
  );
}
