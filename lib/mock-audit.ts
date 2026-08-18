export type CheckStatus = "pass" | "partial" | "fail";

export interface AuditCheck {
  id: string;
  label: string;
  status: CheckStatus;
  verdict: string;
  details: string[];
}

export interface PsiMetric {
  id: string;
  label: string;
  value: string;
  score: number;
}

export interface Recommendation {
  id: string;
  severity: "high" | "medium" | "low";
  title: string;
  body: string;
  action: string;
}

export interface AuditResult {
  url: string;
  overallScore: number;
  pageSpeedScore: number;
  checks: AuditCheck[];
  psiMetrics: PsiMetric[];
  aiSummary: string;
  recommendations: Recommendation[];
}

export const mockAudit: AuditResult = {
  url: "https://example.com",
  overallScore: 74,
  pageSpeedScore: 62,
  checks: [
    {
      id: "title",
      label: "Title tag",
      status: "pass",
      verdict: "Title tag found and well sized.",
      details: [
        '"Example Domain" — 42 characters. Within the recommended 30–60 range.',
      ],
    },
    {
      id: "meta-description",
      label: "Meta description",
      status: "partial",
      verdict: "Meta description present but a little short.",
      details: [
        "Found a 62-character description. Google usually shows 120–158 characters, so you have room to add keywords and a call to action.",
      ],
    },
    {
      id: "headings",
      label: "Heading structure",
      status: "pass",
      verdict: "Heading hierarchy is logical.",
      details: ["One <h1>, and sub-headings follow in order with no skipped levels."],
    },
    {
      id: "alt-text",
      label: "Image alt text",
      status: "fail",
      verdict: "3 images are missing alt text.",
      details: [
        "Images without alt text are invisible to screen readers and lose image-search traffic.",
        "Affected images: logo.png, hero-banner.jpg, cta-graphic.png.",
      ],
    },
    {
      id: "canonical",
      label: "Canonical tag",
      status: "pass",
      verdict: "Self-referencing canonical in place.",
      details: [
        "The page points its canonical at itself, which prevents duplicate-content issues.",
      ],
    },
    {
      id: "robots",
      label: "robots.txt",
      status: "pass",
      verdict: "robots.txt found and allows crawling.",
      details: ["Served at /robots.txt with no blocking rules for this page."],
    },
    {
      id: "sitemap",
      label: "sitemap.xml",
      status: "partial",
      verdict: "Sitemap exists but looks incomplete.",
      details: [
        "Found at /sitemap.xml, but it only lists 1 of the 5 URLs we discovered on the site.",
      ],
    },
  ],
  psiMetrics: [
    { id: "lcp", label: "Largest Contentful Paint", value: "2.6s", score: 71 },
    { id: "tbt", label: "Total Blocking Time", value: "180ms", score: 95 },
    { id: "cls", label: "Cumulative Layout Shift", value: "0.12", score: 82 },
    { id: "fcp", label: "First Contentful Paint", value: "1.8s", score: 63 },
  ],
  aiSummary:
    "Your site is in decent shape — 5 of 7 checks pass and your core SEO fundamentals are solid. The two things holding you back are images and speed: 3 images are missing descriptive alt text, which hurts both accessibility and image search, and your page loads slowly, which Google penalizes on mobile. Fix the alt text first (it's a 10-minute job), then tackle the largest image on your homepage — compressing it will improve your speed score noticeably.",
  recommendations: [
    {
      id: "alt-text-fix",
      severity: "high",
      title: "Add alt text to 3 images",
      body: "Every image should describe what it shows in a sentence — screen readers rely on it, and Google uses it to understand your images.",
      action: "Add descriptive alt attributes to logo.png, hero-banner.jpg, and cta-graphic.png.",
    },
    {
      id: "compress-images",
      severity: "medium",
      title: "Compress your homepage images",
      body: "Your hero image is ~1.4MB and is the main reason Largest Contentful Paint is slow. Smaller files load faster.",
      action: "Convert images to WebP and target under 200KB each.",
    },
    {
      id: "meta-description",
      severity: "low",
      title: "Lengthen the meta description",
      body: "62 characters leaves unused space in search results where you could win clicks with a stronger pitch.",
      action: "Rewrite the description to 120–158 characters with a clear benefit.",
    },
  ],
};

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