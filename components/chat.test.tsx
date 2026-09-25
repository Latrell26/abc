import { render, screen } from "@testing-library/react";
import { Chat } from "@/components/chat";
import type { AuditResult } from "@/lib/audit-types"; 

const mockAudit: AuditResult = {
  url: "https://example.com",
  overallScore: 75,
  pageSpeedScore: 80,
  checks: [
    {
      id: "titleTag",
      label: "Title tag",
      status: "pass",
      verdict: "Title tag found: Example",
      details: [],
    },
    {
      id: "metaDescription",
      label: "Meta description",
      status: "fail",
      verdict: "No meta description found.",
      details: [],
    },
  ],
  psiMetrics: [
    { id: "fcp", label: "First Contentful Paint", value: "1.2s", score: 90 },
    { id: "lcp", label: "Largest Contentful Paint", value: "2.1s", score: 75 },
    { id: "tbt", label: "Total Blocking Time", value: "150ms", score: 60 },
    { id: "cls", label: "Cumulative Layout Shift", value: "0.05", score: 85 },
  ],
  aiSummary: "",
  recommendations: [],
  totalPages: 1,
  pages: [
    {
      url: "https://example.com",
      status: "success",
      overallScore: 75,
      pageSpeedScore: 80,
      checks: { titleTag: "pass", metaDescription: "fail" },
    },
  ],
};

describe("Chat component", () => {
  test("shows empty state with example prompts when no messages", () => {
    render(<Chat audit={mockAudit} />);

    expect(screen.getByRole("log")).toBeInTheDocument();
    expect(screen.getByText(/Ask anything about your audit/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /What should I fix first?/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Which page has the worst heading structure?/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Explain my speed score in plain language/i })).toBeInTheDocument();
  });

  test("renders chat input and send button", () => {
    render(<Chat audit={mockAudit} />);

    expect(screen.getByRole("textbox", { name: /Ask a question about your audit/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send message/i })).toBeInTheDocument();
  });

  test("shows powered by Gemini label", () => {
    render(<Chat audit={mockAudit} />);

    expect(screen.getByText(/Powered by Gemini/i)).toBeInTheDocument();
  });

  test("shows pending state when no audit data", () => {
    render(<Chat />);

    expect(screen.getByText(/Ask anything about your audit/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /What should I fix first?/i })).toBeInTheDocument();
  });

  test("renders example prompts for user to choose from", () => {
    render(<Chat audit={mockAudit} />);

    expect(screen.getByRole("button", { name: /What should I fix first?/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Which page has the worst heading structure?/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Explain my speed score in plain language/i })).toBeInTheDocument();
  });
});