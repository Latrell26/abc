import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/page-placeholder";

export const metadata: Metadata = {
  title: "Error states",
};

export default function ErrorPage() {
  return (
    <PlaceholderPage
      badge="Error states"
      title="When something goes wrong"
      description="Each failure mode gets a clear message with a retry or next-step option, so users are never left staring at a blank screen."
      items={[
        "Invalid URL — validation message on the form",
        "Unreachable site — could not connect",
        "PageSpeed quota or rate limit — retry later",
        "AI failure — dashboard still renders",
      ]}
    />
  );
}
