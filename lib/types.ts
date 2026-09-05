export interface FetchHTMLResult {
  success: boolean;
  html?: string;
  error?: string;
  $: object;
}

export type CheckStatus = "pass" | "partial" | "fail";

export interface CheckResult {
  label: string;
  status: CheckStatus;
  verdict: string;
  details: string[];
}

export interface ScrapeResult {
  titleTag?: CheckResult;
  metaDescription?: CheckResult;
  headingStructure?: CheckResult & {
    h1Count: number;
    h2Count: number;
    h3Count: number;
    hasMultipleH1: boolean;
    skippedLevels: boolean;
  };
  altText?: CheckResult;
  canonicalTag?: CheckResult;
}

export interface PsiMetric {
  id: string;
  label: string;
  value: string;
  score: number;
}

export interface PsiResult {
  url: string;
  overallScore: number;
  pageSpeedScore: number;
  psiMetrics: PsiMetric[];
  /**
   * Human-legible reason when the PageSpeed call failed (timeout, HTTP
   * status, missing score) — surfaced on the dashboard instead of a bare -1.
   */
  error?: string;
}