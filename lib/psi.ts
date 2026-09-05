import type { PsiMetric, PsiResult } from "@/lib/types";

/**
 * Canonical PSI v5 endpoint. Google's path is case-sensitive —
 * `runPagespeed` (capital P) works, lowercase `runpagespeed` 404s.
 * The value is normalized defensively below so a stray space, trailing
 * slash, or wrong case in env can never silently break the call again.
 */
const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

function resolvePsiBaseUrl(): string {
  const raw = process.env.PSI_BASE_URL || PSI_ENDPOINT;
  return raw
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/runpagespeed$/i, "/runPagespeed");
}

const PSI_BASE_URL = resolvePsiBaseUrl();

const ERROR_METRICS: PsiMetric[] = [
  { id: "fcp", label: "First Contentful Paint", value: "Error", score: 0 },
  { id: "lcp", label: "Largest Contentful Paint", value: "Error", score: 0 },
  { id: "tbt", label: "Total Blocking Time", value: "Error", score: 0 },
  { id: "cls", label: "Cumulative Layout Shift", value: "Error", score: 0 },
];

function failure(url: string): PsiResult {
  return {
    url,
    overallScore: -1,
    pageSpeedScore: -1,
    psiMetrics: ERROR_METRICS.map((m) => ({ ...m })),
  };
}

function formatNumeric(auditKey: string, numericValue: number): string {
  if (auditKey === "cumulative-layout-shift") return numericValue.toFixed(3);
  if (auditKey === "total-blocking-time") return `${Math.round(numericValue)}ms`;
  // Paint timings arrive in milliseconds.
  return `${(numericValue / 1000).toFixed(1)}s`;
}

function extractMetric(
  audits: Record<string, unknown>,
  auditKey: string,
  id: string,
  label: string
): PsiMetric {
  const raw = audits[auditKey];
  const audit =
    typeof raw === "object" && raw !== null
      ? (raw as { score?: unknown; displayValue?: unknown; numericValue?: unknown })
      : null;
  const score =
    typeof audit?.score === "number" ? Math.round(audit.score * 100) : 0;
  const value =
    typeof audit?.displayValue === "string" && audit.displayValue.length > 0
      ? audit.displayValue
      : typeof audit?.numericValue === "number"
        ? formatNumeric(auditKey, audit.numericValue)
        : "N/A";
  return { id, label, value, score };
}

export async function getPageSpeed(url: string, apiKey: string): Promise<PsiResult> {
  try {
    const params = new URLSearchParams({
      key: apiKey,
      url,
      strategy: "mobile",
    });

    const res = await fetch(`${PSI_BASE_URL}?${params.toString()}`, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`PSI error: ${res.status}`);
    }

    const data = await res.json();

    // Real PSI v5 shape: scores live under lighthouseResult.categories,
    // metric values under lighthouseResult.audits.
    const lighthouse = data.lighthouseResult as
      | {
          finalUrl?: unknown;
          categories?: { performance?: { score?: unknown } };
          audits?: Record<string, unknown>;
        }
      | undefined;

    const perfScore = lighthouse?.categories?.performance?.score;
    if (typeof perfScore !== "number") {
      throw new Error("PSI response missing performance score");
    }
    const score = Math.round(perfScore * 100);

    const audits = lighthouse?.audits ?? {};
    const psiMetrics: PsiMetric[] = [
      extractMetric(audits, "first-contentful-paint", "fcp", "First Contentful Paint"),
      extractMetric(audits, "largest-contentful-paint", "lcp", "Largest Contentful Paint"),
      extractMetric(audits, "total-blocking-time", "tbt", "Total Blocking Time"),
      extractMetric(audits, "cumulative-layout-shift", "cls", "Cumulative Layout Shift"),
    ];

    return {
      url: typeof lighthouse?.finalUrl === "string" ? lighthouse.finalUrl : url,
      overallScore: score,
      pageSpeedScore: score,
      psiMetrics,
    };
  } catch (error) {
    console.error("PageSpeed API error:", error);
    return failure(url);
  }
}

export type { PsiMetric, PsiResult };