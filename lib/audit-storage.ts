import type {
  AuditCheck,
  AuditPageSummary,
  AuditResult,
  CheckId,
  CheckStatus,
  PsiMetric,
  Recommendation,
} from "@/lib/audit-types";

/**
 * Bridge between the real audit API (`POST /api/audit`) and the dashboard UI.
 *
 * The API returns per-page results; the UI renders a single flattened
 * `AuditResult`. This module maps one shape to the other and persists the
 * mapped result in `sessionStorage` so it survives the
 * `/audit/loading` → `/results` navigation without a database
 * (SPEC.md: no persistence in MVP).
 */

export const AUDIT_STORAGE_KEY = "seo-audit-result";
/** Chat conversation cache key — tagged with CHAT_DOMAIN_KEY below. */
export const CHAT_STORAGE_KEY = "seo-audit-chat";
/** Domain the cached chat conversation belongs to. */
export const CHAT_DOMAIN_KEY = "seo-audit-chat-domain";

/** Raw per-page result as returned by `POST /api/audit`. */
export interface ApiPageResult {
  url: string;
  status: "success" | "failed";
  pageSpeedScore: number;
  overallScore: number;
  psiMetrics: PsiMetric[];
  checks?: {
    titleTag?: { status: string; verdict: string };
    metaDescription?: { status: string; verdict: string };
    headingStructure?: { status: string; verdict: string; h1Count?: number };
    altText?: { status: string; verdict: string };
    canonicalTag?: { status: string; verdict: string };
  };
}

/** Raw top-level response from `POST /api/audit`. */
export interface ApiAuditResponse {
  success: boolean;
  domain: string;
  totalPages: number;
  pageResults: ApiPageResult[];
  overallScore: number;
  aggregateChecks: {
    total: number;
    passed: number;
    failed: number;
    partial: number;
  };
}

const CHECK_LABELS: Record<string, string> = {
  titleTag: "Title tag",
  metaDescription: "Meta description",
  headingStructure: "Heading structure",
  altText: "Image alt text",
  canonicalTag: "Canonical tag",
};

function asStatus(value: unknown): CheckStatus {
  return value === "pass" || value === "partial" || value === "fail"
    ? value
    : "partial";
}

function errorPsiMetrics(): PsiMetric[] {
  return [
    { id: "fcp", label: "First Contentful Paint", value: "Error", score: 0 },
    { id: "lcp", label: "Largest Contentful Paint", value: "Error", score: 0 },
    { id: "tbt", label: "Total Blocking Time", value: "Error", score: 0 },
    { id: "cls", label: "Cumulative Layout Shift", value: "Error", score: 0 },
  ];
}

/**
 * Derives an ordered fix-list from check outcomes.
 * Fails become high priority, partials become medium.
 */
export function recommendationsFromChecks(checks: AuditCheck[]): Recommendation[] {
  const recs: Recommendation[] = [];
  for (const check of checks) {
    if (check.status === "pass") continue;
    recs.push({
      id: `${check.id}-fix`,
      severity: check.status === "fail" ? "high" : "medium",
      title: `Fix: ${check.label}`,
      body: check.verdict,
      action:
        check.details.length > 0
          ? check.details[0]
          : `Review the ${check.label.toLowerCase()} on the audited pages.`,
    });
  }
  return recs;
}

/**
 * Flattens the multi-page API response into the single `AuditResult`
 * shape the dashboard renders. Check outcomes are combined across pages:
 * any fail wins, otherwise any partial wins, otherwise pass.
 */
export function mapApiResponseToAuditResult(
  api: ApiAuditResponse
): AuditResult {
  const successful = api.pageResults.filter((p) => p.status === "success");

  // Nothing usable came back — surface the dashboard's total-failure UI
  // instead of an empty report.
  if (api.overallScore === -1 || successful.length === 0) {
    return failureAuditResult(api.domain);
  }

  const checkIds = [
    "titleTag",
    "metaDescription",
    "headingStructure",
    "altText",
    "canonicalTag",
  ] as const satisfies readonly CheckId[];

  const checks: AuditCheck[] = checkIds.map((id) => {
    const perPage = successful
      .map((page) => {
        const raw = page.checks?.[id];
        if (!raw) return null;
        return { pageUrl: page.url, status: asStatus(raw.status), verdict: raw.verdict };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    if (perPage.length === 0) {
      return {
        id,
        label: CHECK_LABELS[id],
        status: "partial" as CheckStatus,
        verdict: "Not enough data to evaluate this check.",
        details: [],
      };
    }

    const status: CheckStatus = perPage.some((p) => p.status === "fail")
      ? "fail"
      : perPage.some((p) => p.status === "partial")
        ? "partial"
        : "pass";

    const details = perPage.map((p) => `${p.pageUrl}: ${p.verdict}`);
    const badCount = perPage.filter((p) => p.status !== "pass").length;
    const pageWord = perPage.length === 1 ? "page" : "pages";
    const verdict =
      status === "pass"
        ? `Passed on all ${perPage.length} audited ${pageWord}.`
        : `${badCount} of ${perPage.length} ${pageWord} need${badCount === 1 ? "s" : ""} attention — see details.`;

    return { id, label: CHECK_LABELS[id], status, verdict, details };
  });

  const scores = successful
    .map((p) => p.pageSpeedScore)
    .filter((score) => score >= 0);
  const pageSpeedScore =
    scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
      : -1;

  const firstWithMetrics = successful.find(
    (p) => Array.isArray(p.psiMetrics) && p.psiMetrics.length > 0
  );
  const psiMetrics =
    firstWithMetrics?.psiMetrics && firstWithMetrics.psiMetrics.length > 0
      ? firstWithMetrics.psiMetrics
      : errorPsiMetrics();

  return {
    url: api.domain,
    overallScore: api.overallScore,
    pageSpeedScore,
    checks,
    psiMetrics,
    // The live AI summary is generated by the chat panel; keep the
    // static field empty so nothing stale is rendered.
    aiSummary: "",
    recommendations: recommendationsFromChecks(checks),
    totalPages: api.totalPages,
    // Per-page breakdown for the `comparePages` AI tool — built from the
    // raw API pages before they are flattened into `checks` above.
    pages: api.pageResults.map((page): AuditPageSummary => {
      const pageChecks: Partial<Record<CheckId, CheckStatus>> = {};
      for (const id of checkIds) {
        const raw = page.checks?.[id];
        if (raw) pageChecks[id] = asStatus(raw.status);
      }
      return {
        url: page.url,
        status: page.status,
        overallScore: page.overallScore,
        pageSpeedScore: page.pageSpeedScore,
        checks: pageChecks,
      };
    }),
  };
}

/** Builds the stored value for a total pipeline failure (triggers the error UI). */
export function failureAuditResult(domain: string): AuditResult {
  return {
    url: domain,
    overallScore: -1,
    pageSpeedScore: -1,
    checks: [],
    psiMetrics: errorPsiMetrics(),
    aiSummary: "",
    recommendations: [],
    totalPages: 0,
    // No per-page data on total failure — `comparePages` takes its
    // designed error path instead of ranking nothing.
    pages: [],
  };
}

export function saveAuditResult(audit: AuditResult): void {
  try {
    sessionStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(audit));
  } catch {
    // Storage may be unavailable (private mode, quota); the UI falls
    // back to mock data in that case.
  } finally {
    notifyAuditListeners();
  }
}

function parseAuditResult(raw: string): AuditResult | null {
  try {
    const parsed = JSON.parse(raw) as AuditResult;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.url !== "string" ||
      !Array.isArray(parsed.checks) ||
      !Array.isArray(parsed.psiMetrics)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function loadAuditResult(): AuditResult | null {
  try {
    const raw = sessionStorage.getItem(AUDIT_STORAGE_KEY);
    if (!raw) return null;
    return parseAuditResult(raw);
  } catch {
    return null;
  }
}

/**
 * Clears every audit-related sessionStorage entry (result + chat cache).
 * Called when the user starts a new audit from home so a previous run can
 * never leak into the new one — the loading screen always starts blank.
 */
export function clearAuditStorage(): void {
  try {
    sessionStorage.removeItem(AUDIT_STORAGE_KEY);
    sessionStorage.removeItem(CHAT_STORAGE_KEY);
    sessionStorage.removeItem(CHAT_DOMAIN_KEY);
  } catch {
    // Storage may be unavailable; nothing to clear.
  } finally {
    notifyAuditListeners();
  }
}

// --- Reactive snapshot for useSyncExternalStore ---------------------------
// Lets pages render the stored audit synchronously on first paint (no
// skeleton flash on client-side navigation) while staying correct across
// SSR/hydration (server snapshot is always undefined).
// The snapshot is cached by raw string so the reference stays stable
// between renders — returning a fresh object each call would loop.

type AuditListener = () => void;

const auditListeners = new Set<AuditListener>();
let cachedRaw: string | null | undefined;
let cachedValue: AuditResult | null = null;

function notifyAuditListeners(): void {
  for (const listener of auditListeners) {
    try {
      listener();
    } catch {
      // A failing listener must never break storage writes.
    }
  }
}

function handleCrossTabEvent(event: StorageEvent): void {
  if (event.key === null || event.key === AUDIT_STORAGE_KEY) {
    cachedRaw = undefined;
    notifyAuditListeners();
  }
}

export function subscribeAuditStorage(listener: AuditListener): () => void {
  auditListeners.add(listener);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleCrossTabEvent);
  }
  return () => {
    auditListeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleCrossTabEvent);
    }
  };
}

/**
 * Reads the stored audit synchronously. Returns `undefined` on the server
 * (loading) and a referentially stable value on the client.
 */
export function getAuditSnapshot(): AuditResult | null | undefined {
  if (typeof window === "undefined") return undefined;
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(AUDIT_STORAGE_KEY);
  } catch {
    return null;
  }
  if (cachedRaw === undefined || raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = raw ? parseAuditResult(raw) : null;
  }
  return cachedValue;
}
