import { tool } from "ai";
import { z } from "zod";
import type { AuditPageSummary, CheckId } from "@/lib/audit-types";

/**
 * `comparePages` — the MVP's single server-side AI tool (SPEC.md FE-07).
 *
 * The model calls it when the user asks a page-comparison question
 * ("which page has the worst heading structure?"). `execute` ranks the
 * audited pages from the findings already in the request — no re-scraping,
 * no external calls — and returns a ranked list the chat renders as a
 * real component (a Recharts bar chart), not a JSON dump.
 */

export const COMPARE_PAGES_TOOL_NAME = "comparePages" as const;

/**
 * Small and honest on purpose: every field is a field the model can
 * hallucinate, so there is exactly one. `describe()` doubles as model
 * guidance for when to call the tool.
 */
export const comparePagesSchema = z.object({
  metric: z
    .enum([
      "score",
      "pageSpeed",
      "titleTag",
      "metaDescription",
      "headingStructure",
      "altText",
      "canonicalTag",
    ])
    .describe(
      "The SEO metric to rank pages by: overall 'score', 'pageSpeed' score, or one of the five technical check categories."
    ),
});

export type ComparePagesInput = z.infer<typeof comparePagesSchema>;

export type ComparePagesMetric = ComparePagesInput["metric"];

export const COMPARE_PAGES_TOOL_DESCRIPTION =
  "Compare the audited pages of this site by one SEO metric. Call it when the user asks which page is best or worst, or wants pages ranked — e.g. 'which page has the worst heading structure?' or 'compare page speeds'. Do not call it for site-wide questions that need no comparison.";

export interface ComparePagesRankingEntry {
  url: string;
  /** Numeric value shown in the chart: the score, or the issue count for check metrics. */
  value: number;
  /** Issues found in this category (fail = 2, partial = 1, pass = 0); 0 for numeric metrics. */
  issues: number;
  overallScore: number;
}

export interface ComparePagesOutput {
  metric: ComparePagesMetric;
  /** Best-first for numeric metrics; worst-first for check metrics. */
  ranking: ComparePagesRankingEntry[];
  bestUrl: string;
  worstUrl: string;
  /** Pages excluded because they failed to audit (never ranked). */
  skippedCount: number;
}

function issueWeight(status: "pass" | "partial" | "fail"): number {
  if (status === "fail") return 2;
  if (status === "partial") return 1;
  return 0;
}

function errorMessage(pages: AuditPageSummary[] | undefined): string | null {
  if (!pages || pages.length === 0) {
    return "Per-page data was not saved with this audit. Re-run the audit to compare pages.";
  }
  if (!pages.some((p) => p.status === "success")) {
    return "None of the audited pages produced usable results, so there is nothing to compare.";
  }
  return null;
}

/**
 * Ranks pages by metric. For numeric metrics (`score`, `pageSpeed`),
 * ranks by that value, best first. For check metrics, "worst" means most
 * issues in that category (fail counts double); ties break by overall
 * score, lowest first — per SPEC.md.
 *
 * Throws a plain Error when there is nothing to rank. The AI SDK turns a
 * thrown execute error into the tool part's `output-error` state, which
 * the chat renders as a designed retry card (never a crash).
 */
export function executeComparePages(
  input: ComparePagesInput,
  pages: AuditPageSummary[] | undefined
): ComparePagesOutput {
  const problem = errorMessage(pages);
  if (problem) throw new Error(problem);

  const usable = (pages as AuditPageSummary[]).filter(
    (p) => p.status === "success"
  );
  const skippedCount = (pages as AuditPageSummary[]).length - usable.length;

  let ranking: ComparePagesRankingEntry[];
  if (input.metric === "score" || input.metric === "pageSpeed") {
    const pick = (p: AuditPageSummary) =>
      input.metric === "score" ? p.overallScore : p.pageSpeedScore;
    // Pages whose PSI score is -1 (speed fetch failed) sort last.
    ranking = [...usable]
      .sort((a, b) => pick(b) - pick(a))
      .map((p) => ({
        url: p.url,
        value: pick(p),
        issues: 0,
        overallScore: p.overallScore,
      }));
  } else {
    const checkId = input.metric as CheckId;
    ranking = [...usable]
      .map((p) => {
        const status = p.checks[checkId];
        // A page missing this check category counts as one issue —
        // honest about gaps in the data rather than calling it clean.
        const issues = status ? issueWeight(status) : 1;
        return { url: p.url, value: issues, issues, overallScore: p.overallScore };
      })
      .sort((a, b) => b.issues - a.issues || a.overallScore - b.overallScore);
  }

  return {
    metric: input.metric,
    ranking,
    bestUrl: input.metric === "score" || input.metric === "pageSpeed"
      ? ranking[0].url
      : ranking[ranking.length - 1].url,
    worstUrl: input.metric === "score" || input.metric === "pageSpeed"
      ? ranking[ranking.length - 1].url
      : ranking[0].url,
    skippedCount,
  };
}

/**
 * Builds the request-scoped tool definition for `streamText`. The audit
 * pages are captured in the closure — `execute` never touches the network.
 */
export function createComparePagesTool(pages: AuditPageSummary[] | undefined) {
  return tool({
    description: COMPARE_PAGES_TOOL_DESCRIPTION,
    inputSchema: comparePagesSchema,
    execute: async (input: ComparePagesInput) =>
      executeComparePages(input, pages),
  });
}
