import type { Metadata } from "next";
import Link from "next/link";
import { PlaceholderPage } from "@/components/page-placeholder";

export const metadata: Metadata = {
  title: "Results",
};

export default function ResultsPage() {
  return (
    <div className="flex flex-col gap-6">
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
      <p className="rounded-md bg-muted px-4 py-2 text-sm text-muted-foreground">
        No audit yet —{" "}
        <Link href="/" className="font-semibold text-primary hover:underline">
          run an audit from Home
        </Link>{" "}
        to see your report here.
      </p>
    </div>
  );
}
