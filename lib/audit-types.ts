import type { PsiMetric } from "@/lib/types";

export type { PsiMetric };

export type CheckStatus = "pass" | "partial" | "fail";

/** Stable ids for the five technical check categories. */
export type CheckId =
  | "titleTag"
  | "metaDescription"
  | "headingStructure"
  | "altText"
  | "canonicalTag";

export interface AuditCheck {
  id: string;
  label: string;
  status: CheckStatus;
  verdict: string;
  details: string[];
}

export interface Recommendation {
  id: string;
  severity: "high" | "medium" | "low";
  title: string;
  body: string;
  action: string;
}

/**
 * Structured per-page summary. This is what the `comparePages` AI tool
 * ranks — it must survive the API-to-dashboard mapping intact, unlike the
 * flattened `checks` above which merge all pages together.
 */
export interface AuditPageSummary {
  url: string;
  status: "success" | "failed";
  overallScore: number;
  pageSpeedScore: number;
  checks: Partial<Record<CheckId, CheckStatus>>;
}

export interface AuditResult {
  url: string;
  overallScore: number;
  pageSpeedScore: number;
  checks: AuditCheck[];
  psiMetrics: PsiMetric[];
  aiSummary: string;
  recommendations: Recommendation[];
  /** Number of pages audited. Defaults to 1 for single-page audits. */
  totalPages?: number;
  /**
   * Per-page breakdown for the `comparePages` tool. Optional so audits
   * stored before this field existed still load (the tool then takes its
   * designed error path instead of crashing).
   */
  pages?: AuditPageSummary[];
}

export function scoreTone(score: number): "success" | "warning" | "danger" {
  if (score >= 90) return "success";
  if (score >= 50) return "warning";
  return "danger";
}

export function statusTone(status: CheckStatus): "success" | "warning" | "danger" {
  if (status === "pass") return "success";
  if (status === "partial") return "warning";
  return "danger";
}
