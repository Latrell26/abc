import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/page-placeholder";

export const metadata: Metadata = {
  title: "AI Summary",
};

export default function AiSummaryPage() {
  return (
    <PlaceholderPage
      badge="AI summary panel"
      title="What your results mean"
      description="A Claude-powered panel that explains your top issues and recommends fixes in plain language — no jargon."
      items={[
        "Plain-language summary of top issues",
        "Prioritized fix recommendations",
        "Explains what each issue means",
        "Next-step actions for non-technical owners",
      ]}
    />
  );
}
