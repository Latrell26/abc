import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/page-placeholder";

export const metadata: Metadata = {
  title: "Results",
};

export default function ResultsPage() {
  return (
    <PlaceholderPage
      badge="Results dashboard"
      title="Your SEO report"
      description="After an audit completes, this screen shows the overall 0–100 score, a pass/fail breakdown of every check, and charts."
      items={[
        "Overall score (0–100)",
        "Pass/fail breakdown by check",
        "Score cards",
        "Recharts visualizations",
        "Title & meta tags check",
        "Heading structure check",
        "Alt text check",
        "Canonical tag check",
        "robots.txt check",
        "sitemap.xml check",
        "Page speed score",
      ]}
    />
  );
}
