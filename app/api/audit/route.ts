import { parse } from "tldts";
import { load as loadCheerio } from "cheerio";
import { fetchHTML } from "@/lib/scrape";
import { getPageSpeed } from "@/lib/psi";
import type { PsiResult } from "@/lib/psi";

const MAX_PAGES = 10;

/**
 * Vercel's serverless functions cap out at 60s (see vercel.json), and the
 * audit does sequential PSI lab runs (~10-25s each). This budget stops the
 * route launching new batches before the platform can kill the request —
 * remaining pages are marked with a reason instead of the whole run dying.
 */
const AUDIT_BUDGET_MS = 50000;

// Belt and suspenders with vercel.json: the explicit export is what the
// App Router reliably honors for this route's function duration.
export const maxDuration = 60;

/** PSI-less placeholder metrics for pages that never reached PageSpeed. */
const ERROR_PSI_METRICS = [
  { id: "fcp", label: "First Contentful Paint", value: "Error", score: 0 },
  { id: "lcp", label: "Largest Contentful Paint", value: "Error", score: 0 },
  { id: "tbt", label: "Total Blocking Time", value: "Error", score: 0 },
  { id: "cls", label: "Cumulative Layout Shift", value: "Error", score: 0 },
];

// Helpers

function getETLDPlus1(url: string): string {
  try {
    const parsed = parse(url);
    return parsed.domain || url;
  } catch {
    return url;
  }
}

function isSameRegistrableDomain(url: string, domainEtld: string): boolean {
  try {
    const clean = url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
    const urlEtld = getETLDPlus1(clean);
    return urlEtld === domainEtld;
  } catch {
    return false;
  }
}

/** Ensures a URL has a protocol so fetch() accepts it. */
function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  return /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** Depth of a URL path — shallower pages (homepage, section fronts) first. */
function pathDepth(url: string): number {
  try {
    return new URL(normalizeUrl(url)).pathname.split("/").filter(Boolean).length;
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}

/**
 * Keeps full URLs intact (never strips the protocol), drops off-site
 * entries, and prioritizes shallower URLs up to MAX_PAGES.
 */
function prioritizeShallowUrls(urls: string[], domainEtld: string): string[] {
  return urls
    .map((u) => u.trim())
    .filter((u) => u.startsWith("http") && isSameRegistrableDomain(u, domainEtld))
    .sort((a, b) => pathDepth(a) - pathDepth(b))
    .slice(0, MAX_PAGES);
}

// Sitemap fetching (sync/await, not generator)

async function fetchSitemapUrls(domain: string): Promise<string[]> {
  const hostname = domain.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  const protocols = ["https:", "http:"];

  for (const protocol of protocols) {
    try {
      const sitemapUrl = `${protocol}//${hostname}/sitemap.xml`;
      const res = await fetch(sitemapUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) continue;

      const xml = await res.text();
      const urls: string[] = [];
      const urlMatches = xml.match(/<loc>(.*?)<\/loc>/g);
      if (urlMatches) {
        for (const match of urlMatches) {
          const url = match.replace(/<[^>]+>/g, "").trim();
          if (url.startsWith("http")) {
            urls.push(url);
          }
        }
      }

      if (urls.length > 0) return urls;
    } catch {
      continue;
    }
  }

  return [];
}

async function fetchRobotsSitemap(domain: string): Promise<string | null> {
  const hostname = domain.replace(/^https?:\/\//i, "").replace(/\/$/, "");

  try {
    const robotsUrl = `https://${hostname}/robots.txt`;
    const res = await fetch(robotsUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) return null;

    const xml = await res.text();
    const sitemapMatch = xml.match(/Sitemap:(https?:\/\/[^\s]+)/i);
    if (sitemapMatch) {
      return sitemapMatch[1].trim();
    }
  } catch {
    // continue to fallback
  }

  return null;
}

// Single-page page audit (returns result object, not generator)

async function auditSinglePage(
  url: string,
  psiKey: string
): Promise<{
  url: string;
  status: "success" | "failed";
  checks?: {
    titleTag?: { status: "pass" | "fail" | "partial"; verdict: string };
    metaDescription?: { status: "pass" | "fail" | "partial"; verdict: string };
    headingStructure?: {
      status: "pass" | "fail" | "partial";
      verdict: string;
      h1Count: number;
    };
    altText?: { status: "pass" | "fail" | "partial"; verdict: string };
    canonicalTag?: { status: "pass" | "fail" | "partial"; verdict: string };
  };
  pageSpeedScore: number;
  overallScore: number;
  psiMetrics: Array<{ id: string; label: string; value: string; score: number }>;
  /** Why this page failed, e.g. "HTTP 403" or a fetch timeout message. */
  error?: string;
}> {
  // 1. Fetch HTML
  const htmlResult = await fetchHTML(url);
  if (!htmlResult.success) {
    return {
      url,
      status: "failed",
      pageSpeedScore: -1,
      overallScore: -1,
      psiMetrics: [
        { id: "fcp", label: "First Contentful Paint", value: "Error", score: 0 },
        { id: "lcp", label: "Largest Contentful Paint", value: "Error", score: 0 },
        { id: "tbt", label: "Total Blocking Time", value: "Error", score: 0 },
        { id: "cls", label: "Cumulative Layout Shift", value: "Error", score: 0 },
      ],
      error: htmlResult.error ?? "Page fetch failed",
    };
  }

  // 2. Scrape basic checks (simplified)
  const $ = htmlResult.html ? loadCheerio(htmlResult.html) : loadCheerio("<html></html>");

  // Title tag
  const title = $("head > title").first().text() || $("meta[property='og:title']").first().attr("content");
  let titleStatus: "pass" | "fail" | "partial" = "fail";
  let titleVerdict = "";
  if (title) {
    titleStatus = "pass";
    titleVerdict = `Title tag found: "${title}"`;
  } else {
    titleVerdict = "No title tag found.";
  }

  // Meta description
  const metaDesc = $("meta[name='description']").first().attr("content");
  let metaStatus: "pass" | "fail" | "partial" = "fail";
  let metaVerdict = "";
  if (metaDesc) {
    metaStatus = "pass";
    metaVerdict = `Meta description present (${metaDesc.length} chars)`;
  } else {
    metaVerdict = "No meta description found.";
  }

  // Heading structure
  const h1Count = $("h1").length;
  let headStatus: "pass" | "fail" | "partial" = "fail";
  let headVerdict = "";
  if (h1Count === 1) {
    headStatus = "pass";
    headVerdict = "Heading hierarchy is logical.";
  } else if (h1Count > 1) {
    headStatus = "partial";
    headVerdict = "Multiple H1 tags found.";
  } else {
    headVerdict = "No H1 tag found.";
  }

  // Alt text — count images genuinely missing an alt attribute.
  const images = $("img");
  const imgCount = images.length;
  const imgsWithAlt = $("img[alt]").length;
  const imgsWithoutAlt = imgCount - imgsWithAlt;
  let altStatus: "pass" | "fail" | "partial" = "partial";
  let altVerdict = "";
  if (imgCount === 0) {
    altStatus = "partial";
    altVerdict = "No images found.";
  } else if (imgsWithoutAlt === 0) {
    altStatus = "pass";
    altVerdict = "All images have alt text.";
  } else {
    altStatus = "fail";
    altVerdict = `${imgsWithoutAlt} of ${imgCount} images missing alt text.`;
  }

  // Canonical tag
  const canonical = $("link[rel='canonical']").first().attr("href") || $("head > link[rel='canonical']").first().attr("href");
  let canonStatus: "pass" | "fail" | "partial" = "fail";
  let canonVerdict = "";
  if (canonical) {
    canonStatus = "pass";
    canonVerdict = `Canonical tag found: ${canonical}`;
  } else {
    canonVerdict = "No canonical tag found.";
  }

  // 3. PageSpeed (getPageSpeed never throws — it returns -1 scores on failure)
  const psiData: PsiResult = await getPageSpeed(url, psiKey);

  // Per-page overall: prefer the PSI score when available, otherwise derive
  // it from this page's own technical checks so the number always reflects
  // real findings — never a fabricated placeholder.
  const pageCheckStatuses = [titleStatus, metaStatus, headStatus, altStatus, canonStatus];
  const pagePassedCount = pageCheckStatuses.filter((s) => s === "pass").length;
  const overallScore =
    psiData.overallScore >= 0
      ? psiData.overallScore
      : Math.round((pagePassedCount / pageCheckStatuses.length) * 100);

  return {
    url,
    status: "success",
    checks: {
      titleTag: { status: titleStatus, verdict: titleVerdict },
      metaDescription: { status: metaStatus, verdict: metaVerdict },
      headingStructure: { status: headStatus, verdict: headVerdict, h1Count },
      altText: { status: altStatus, verdict: altVerdict },
      canonicalTag: { status: canonStatus, verdict: canonVerdict },
    },
    pageSpeedScore: psiData.pageSpeedScore,
    overallScore,
    psiMetrics: psiData.psiMetrics,
  };
}

// Main API handler

export async function POST(req: Request) {
  const startedAt = Date.now();
  try {
    const body = await req.json();
    const { domain, manualUrls, psiKey } = body;

    if (!domain) {
      return Response.json({ error: "Domain is required" }, { status: 400 });
    }

    // Normalize
    const domainEtld = getETLDPlus1(domain);
    const domainUrl = domain.startsWith("http") ? new URL(domain).origin : `https://${domain}`;

    // Determine page URLs
    let pageUrls: string[] = [];
    let discovery: "manual" | "sitemap" | "robotsSitemap" | "fallback" = "fallback";

    if (manualUrls && Array.isArray(manualUrls)) {
      // Validate all manual URLs share same registrable domain
      for (const url of manualUrls) {
        if (!isSameRegistrableDomain(url, domainEtld)) {
          return Response.json(
            { error: `URL "${url}" is not on the same site.` },
            { status: 400 }
          );
        }
      }
      pageUrls = manualUrls
        .filter(
          (u: string) => u && /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/i.test(u)
        )
        .map((u: string) => normalizeUrl(u))
        .filter((u: string) => isSameRegistrableDomain(u, domainEtld));
      discovery = "manual";
    } else {
      // Automatic page discovery
      // 1. Try sitemap.xml
      const sitemapUrls = await fetchSitemapUrls(domainEtld);
      if (sitemapUrls.length > 0) {
        pageUrls = prioritizeShallowUrls(sitemapUrls, domainEtld);
        discovery = "sitemap";
      } else {
        // 2. Try robots.txt sitemap directive
        const robotsSitemap = await fetchRobotsSitemap(domainEtld);
        if (robotsSitemap) {
          try {
            const res = await fetch(robotsSitemap, {
              headers: { "User-Agent": "Mozilla/5.0" },
              signal: AbortSignal.timeout(12000),
            });
            if (res.ok) {
              const xml = await res.text();
              const urls: string[] = [];
              const urlMatches = xml.match(/<loc>(.*?)<\/loc>/g);
              if (urlMatches) {
                for (const match of urlMatches) {
                  const url = match.replace(/<[^>]+>/g, "").trim();
                  if (url.startsWith("http")) urls.push(url);
                }
              }
              pageUrls = prioritizeShallowUrls(urls, domainEtld);
              if (pageUrls.length > 0) discovery = "robotsSitemap";
            }
          } catch {
            // continue to fallback
          }
        }

        // 3. Fallback: single page audit of submitted domain
        if (!pageUrls.length) {
          pageUrls = [domainUrl];
        }
      }
    }

    // Cap at 10 pages
    pageUrls = pageUrls.slice(0, MAX_PAGES);

    if (pageUrls.length === 0) {
      return Response.json({ error: "No pages discovered for audit." }, { status: 400 });
    }

    // Audit pages in batches of 3 (respecting PSI rate limits)
    const results: Array<{
      url: string;
      status: "success" | "failed";
      pageSpeedScore: number;
      overallScore: number;
      psiMetrics: Array<{ id: string; label: string; value: string; score: number }>;
      error?: string;
      checks?: {
        titleTag?: { status: string; verdict: string };
        metaDescription?: { status: string; verdict: string };
        headingStructure?: { status: string; h1Count: number };
        altText?: { status: string };
        canonicalTag?: { status: string };
      };
    }> = [];

    let totalChecks = 0;
    let passedChecks = 0;
    let failedChecks = 0;
    let partialChecks = 0;

    const effectivePsiKey = psiKey || process.env.GOOGLE_PAGESPEED_API_KEY || "";

    for (let i = 0; i < pageUrls.length; i += 3) {
      // Past the time budget: mark every remaining page with a reason
      // instead of letting the platform kill the whole request. The
      // dashboard still reports whatever already finished.
      if (Date.now() - startedAt > AUDIT_BUDGET_MS) {
        for (const url of pageUrls.slice(i)) {
          results.push({
            url,
            status: "failed",
            pageSpeedScore: -1,
            overallScore: -1,
            psiMetrics: ERROR_PSI_METRICS.map((m) => ({ ...m })),
            error: "Skipped: audit time budget (50s) exceeded on the server.",
          });
        }
        break;
      }

      const batch = pageUrls.slice(i, i + 3);

      await Promise.all(
        batch.map((url) =>
          auditSinglePage(url, effectivePsiKey).then((result) => {
            results.push({
              url: result.url,
              status: result.status,
              pageSpeedScore: result.pageSpeedScore,
              overallScore: result.overallScore,
              psiMetrics: result.psiMetrics,
              error: result.error,
              checks: result.checks,
            });

            // Aggregate counts — one entry per individual check so the
            // pass rate stays within 0–100%.
            if (result.checks) {
              const categories = [
                result.checks.titleTag,
                result.checks.metaDescription,
                result.checks.headingStructure,
                result.checks.altText,
                result.checks.canonicalTag,
              ];
              for (const category of categories) {
                if (!category) continue;
                totalChecks++;
                if (category.status === "pass") passedChecks++;
                else if (category.status === "fail") failedChecks++;
                else partialChecks++;
              }
            }
          })
        )
      );
    }

    // Site-wide score from real findings only. -1 when nothing succeeded
    // (drives the dashboard's total-failure state); otherwise PSI average
    // blended with the check pass rate, or the pass rate alone when PSI
    // returned no usable scores.
    const successfulResults = results.filter((r) => r.status === "success");
    let siteWideScore: number;
    if (successfulResults.length === 0) {
      siteWideScore = -1;
    } else {
      const usablePsScores = successfulResults
        .map((r) => r.pageSpeedScore)
        .filter((score) => score >= 0);
      const checkPassRate = totalChecks > 0 ? passedChecks / totalChecks : 0.5;
      if (usablePsScores.length > 0) {
        const avgPSScore =
          usablePsScores.reduce((sum, s) => sum + s, 0) / usablePsScores.length;
        siteWideScore = Math.round(avgPSScore * 0.6 + checkPassRate * 100 * 0.4);
      } else {
        siteWideScore = Math.round(checkPassRate * 100);
      }
      if (siteWideScore > 100) siteWideScore = 100;
      if (siteWideScore < 0) siteWideScore = 0;
    }

    return Response.json({
      success: true,
      domain: domainUrl,
      totalPages: results.length,
      pageResults: results,
      overallScore: siteWideScore,
      aggregateChecks: {
        total: totalChecks,
        passed: passedChecks,
        failed: failedChecks,
        partial: partialChecks,
      },
      // Telemetry for the dashboard's failure messaging — no sensitive
      // data, just how the audit was discovered and how it ended.
      diagnostics: {
        discovery,
        discoveredCount: pageUrls.length,
        auditedCount: successfulResults.length,
        failedCount: results.length - successfulResults.length,
        durationMs: Date.now() - startedAt,
      },
    });
  } catch (error) {
    console.error("Audit API error:", error);
    return Response.json(
      { error: "Internal server error during audit." },
      { status: 500 }
    );
  }
}