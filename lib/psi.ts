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

function failure(url: string, error?: string): PsiResult {
  return {
    url,
    overallScore: -1,
    pageSpeedScore: -1,
    psiMetrics: ERROR_METRICS.map((m) => ({ ...m })),
    error,
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

export interface PageSpeedOptions {
  /** Per-attempt timeout in ms. Default 70000. */
  timeoutMs?: number;
  /** Extra attempts after the first failure. Default 1. */
  retries?: number;
}

// Generous single attempt: under the 300s Fluid ceiling a 70s PageSpeed
// lab run is affordable, and a run that is merely slow succeeds in the
// one attempt rather than dying at 35s and surfacing N/A. Timed-out
// attempts are still not retried (a stuck run is unlikely to clear on a
// second try); only fast failures (429/5xx) get the backoff retry.
const DEFAULT_TIMEOUT_MS = 70000;
const DEFAULT_RETRIES = 1;
const RETRY_WAIT_MS = 2000;
const MAX_RETRY_AFTER_MS = 10000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Turns a thrown PSI failure into a dashboard-legible reason — timeouts
 * and HTTP statuses read very differently to a user ("Google was slow"
 * vs "Google throttled us"), and knowing which one it was is the whole
 * point.
 */
function isTimeoutError(error: unknown): boolean {
  if (
    typeof DOMException !== "undefined" &&
    error instanceof DOMException &&
    error.name === "TimeoutError"
  ) {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /\btimeout\b|\babort(?:ed|ing)?\b/i.test(message);
}

function describePsiFailure(error: unknown, timeoutMs: number): string {
  const message = error instanceof Error ? error.message : String(error);
  if (isTimeoutError(error)) {
    return `PageSpeed request timed out after ${Math.round(timeoutMs / 1000)}s`;
  }
  const statusMatch = message.match(/^PSI error: (\d{3})/);
  if (statusMatch) {
    return statusMatch[1] === "429"
      ? "PageSpeed rate-limited the server (HTTP 429)"
      : `PageSpeed returned HTTP ${statusMatch[1]}`;
  }
  if (/no performance score/i.test(message)) {
    return "PageSpeed returned no performance score";
  }
  return message.length > 0 ? message : "PageSpeed request failed";
}

export async function getPageSpeed(
  url: string,
  apiKey: string,
  opts?: PageSpeedOptions
): Promise<PsiResult> {
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxAttempts = (opts?.retries ?? DEFAULT_RETRIES) + 1;
  let lastError: unknown = new Error("PageSpeed request failed");

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let retryAfterHeader: string | null = null;
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
        // A hung lab run must never stall its whole batch — the audit
        // route works under a hard serverless time budget (see route.ts).
        signal: AbortSignal.timeout(timeoutMs),
      });
      retryAfterHeader = res.headers.get("retry-after");

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
      lastError = error;
      if (attempt + 1 >= maxAttempts) break;
      // Retry fast failures only (rate limits, transient HTTP/parse
      // errors). A timed-out attempt already consumed the full envelope —
      // retrying it would double the worst case for little benefit.
      if (isTimeoutError(error)) break;
      // Intermittent 429s/5xx are common against PSI from a shared
      // datacenter IP — one backoff retry cures most of them. Honor the
      // server's own backoff when it names one.
      const retryAfterSec = retryAfterHeader
        ? parseInt(retryAfterHeader, 10)
        : NaN;
      const waitMs =
        Number.isFinite(retryAfterSec) && retryAfterSec > 0
          ? Math.min(retryAfterSec * 1000, MAX_RETRY_AFTER_MS)
          : RETRY_WAIT_MS;
      await sleep(waitMs);
    }
  }

  const reason = describePsiFailure(lastError, timeoutMs);
  console.error("PageSpeed API error:", lastError);
  return failure(url, reason);
}

export type { PsiMetric, PsiResult };