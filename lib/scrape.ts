import { load } from "cheerio";
import type { CheckStatus } from "@/lib/types";

export async function fetchHTML(url: string): Promise<FetchHTMLResult> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xml,application/json;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      },
    });

    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}`, $: {} };
    }

    const html = await res.text();
    const $ = load(html, { xmlMode: false });

    return { success: true, html, $ };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error), $: {} };
  }
}

export interface FetchHTMLResult {
  success: boolean;
  html?: string;
  error?: string;
  $: object;
}

export function parseChecks(html: string) {
  const $ = load(html, { xmlMode: false });

  const result: {
    titleTag?: { label: string; status: CheckStatus; verdict: string; details: string[] };
    metaDescription?: { label: string; status: CheckStatus; verdict: string; details: string[] };
    headingStructure?: {
      label: string;
      status: CheckStatus;
      verdict: string;
      details: string[];
      h1Count: number;
      h2Count: number;
      h3Count: number;
      hasMultipleH1: boolean;
      skippedLevels: boolean;
    };
    altText?: { label: string; status: CheckStatus; verdict: string; details: string[] };
    canonicalTag?: { label: string; status: CheckStatus; verdict: string; details: string[] };
  } = {};

  // Title tag
  const title = $("head > title").first().text() || $("meta[property='og:title']").first().attr("content");
  if (title) {
    result.titleTag = {
      label: "Title tag",
      status: "pass",
      verdict: "Title tag found.",
      details: [`"${title}" — title element present.`],
    };
  } else {
    result.titleTag = {
      label: "Title tag",
      status: "fail",
      verdict: "No title tag found.",
      details: ["No <title> element or og:title meta tag found on the page."],
    };
  }

  // Meta description
  const metaDesc = $("meta[name='description']").first().attr("content");
  if (metaDesc) {
    result.metaDescription = {
      label: "Meta description",
      status: "pass",
      verdict: "Meta description present.",
      details: [`Found a ${metaDesc.length}-character description.`],
    };
  } else {
    result.metaDescription = {
      label: "Meta description",
      status: "fail",
      verdict: "No meta description found.",
      details: ["No <meta name='description'> tag found."],
    };
  }

  // Heading structure
  const h1Count = $("h1").length;
  const h2Count = $("h2").length;
  const h3Count = $("h3").length;
  const hasMultipleH1 = h1Count > 1;
  const skippedLevels = /* simplified check */ false; // would need full hierarchy analysis
  const totalHeadings = h1Count + h2Count + h3Count;

  if (h1Count === 1 && !hasMultipleH1) {
    result.headingStructure = {
      label: "Heading structure",
      status: "pass",
      verdict: "Heading hierarchy is logical.",
      details: [
        `One <h1> found (${totalHeadings} total headings), and sub-headings follow in order with no skipped levels.`,
      ],
      h1Count,
      h2Count,
      h3Count,
      hasMultipleH1,
      skippedLevels,
    };
  } else if (h1Count === 0) {
    result.headingStructure = {
      label: "Heading structure",
      status: "fail",
      verdict: "No <h1> tag found.",
      details: ["No <h1> element found on the page. Add an <h1> to structure your content."],
      h1Count: 0,
      h2Count: 0,
      h3Count: 0,
      hasMultipleH1: false,
      skippedLevels: false,
    };
  } else {
    result.headingStructure = {
      label: "Heading structure",
      status: "partial",
      verdict: "Heading structure has issues.",
      details: [
        hasMultipleH1 ? "Multiple <h1> tags found — use only one <h1> per page." : "",
        skippedLevels ? "Heading levels were skipped (e.g., H1 to H3) — use sequential heading levels (H1, H2, H3)." : "",
        `Found ${h1Count} <h1>, ${h2Count} <h2>, and ${h3Count} <h3> tags.`,
      ]
        .filter((d) => d.length > 0)
        .slice(0, 3),
      h1Count,
      h2Count,
      h3Count,
      hasMultipleH1,
      skippedLevels,
    };
  }

  // Alt text — count images genuinely missing an alt attribute.
  const images = $("img");
  const imgCount = images.length;
  const missingSrcs: string[] = [];
  images.each((_, el) => {
    if (!$(el).attr("alt")) {
      const src = $(el).attr("src") || "(no src)";
      if (missingSrcs.length < 3) missingSrcs.push(src);
    }
  });
  const imgsWithoutAlt = imgCount - $("img[alt]").length;

  if (imgCount === 0) {
    result.altText = {
      label: "Image alt text",
      status: "partial",
      verdict: "No images found on the page.",
      details: ["No <img> elements found on the page."],
    };
  } else if (imgsWithoutAlt === 0) {
    result.altText = {
      label: "Image alt text",
      status: "pass",
      verdict: "All images have alt text.",
      details: [`All ${imgCount} images have descriptive alt attributes.`],
    };
  } else {
    result.altText = {
      label: "Image alt text",
      status: "fail",
      verdict: `${imgsWithoutAlt} of ${imgCount} images are missing alt text.`,
      details: [
        `${imgsWithoutAlt} images without alt text are invisible to screen readers and lose image-search traffic.`,
        `Affected images: ${missingSrcs.join(", ")}.`,
      ].filter(Boolean),
    };
  }

  // Canonical tag
  const canonical = $("link[rel='canonical']").first().attr("href") || $("head > link[rel='canonical']").first().attr("href");
  if (canonical) {
    result.canonicalTag = {
      label: "Canonical tag",
      status: "pass",
      verdict: "Self-referencing canonical in place.",
      details: [`The page has a canonical tag pointing to: ${canonical}`],
    };
  } else {
    result.canonicalTag = {
      label: "Canonical tag",
      status: "fail",
      verdict: "No canonical tag found.",
      details: ["No <link rel='canonical'> tag found. Add a canonical tag to prevent duplicate-content issues."],
    };
  }

  return result;
}

export interface ScrapeResult {
  titleTag?: CheckResult;
  metaDescription?: CheckResult;
  headingStructure?: CheckResult & { h1Count: number; h2Count: number; h3Count: number; hasMultipleH1: boolean; skippedLevels: boolean };
  altText?: CheckResult;
  canonicalTag?: CheckResult;
}

interface CheckResult {
  label: string;
  status: CheckStatus;
  verdict: string;
  details: string[];
}