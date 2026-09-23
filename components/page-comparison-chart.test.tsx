import { render, screen } from "@testing-library/react";
import { PageComparisonChart } from "@/components/page-comparison-chart";

const baseOutput = {
  metric: "headingStructure" as const,
  ranking: [
    { url: "https://example.com/page1", value: 2, issues: 2, overallScore: 60 },
    { url: "https://example.com/page2", value: 1, issues: 1, overallScore: 75 },
    { url: "https://example.com/page3", value: 0, issues: 0, overallScore: 90 },
  ],
  bestUrl: "https://example.com/page3",
  worstUrl: "https://example.com/page1",
  skippedCount: 1,
};

describe("PageComparisonChart component", () => {
  test("renders chart with metric label", () => {
    render(<PageComparisonChart output={baseOutput} />);

    expect(screen.getByRole("figure")).toBeInTheDocument();
    expect(screen.getByText(/Pages by Heading structure issues/i)).toBeInTheDocument();
  });

  test("shows best and worst page labels", () => {
    render(<PageComparisonChart output={baseOutput} />);

    expect(screen.getByText(/Best:/i)).toBeInTheDocument();
    expect(screen.getByText(/example\.com\/page3/i)).toBeInTheDocument();
    expect(screen.getByText(/Worst:/i)).toBeInTheDocument();
    expect(screen.getByText(/example\.com\/page1/i)).toBeInTheDocument();
  });

  test("shows skipped count when pages failed to audit", () => {
    render(<PageComparisonChart output={baseOutput} />);

    expect(screen.getByText(/skipped \(failed to audit\)/i)).toBeInTheDocument();
  });

  test("renders numeric metric with score colors", () => {
    const numericOutput = {
      ...baseOutput,
      metric: "score" as const,
      ranking: [
        { url: "https://example.com/page1", value: 90, issues: 0, overallScore: 90 },
        { url: "https://example.com/page2", value: 70, issues: 0, overallScore: 70 },
        { url: "https://example.com/page3", value: 40, issues: 0, overallScore: 40 },
      ],
      bestUrl: "https://example.com/page1",
      worstUrl: "https://example.com/page3",
      skippedCount: 0,
    };

    render(<PageComparisonChart output={numericOutput} />);

    expect(screen.getByText(/Pages by Overall score/i)).toBeInTheDocument();
    expect(screen.getByText(/Best:/i)).toBeInTheDocument();
    expect(screen.getByText(/example\.com\/page1/i)).toBeInTheDocument();
    expect(screen.getByText(/Worst:/i)).toBeInTheDocument();
    expect(screen.getByText(/example\.com\/page3/i)).toBeInTheDocument();
  });

  test("handles empty ranking gracefully", () => {
    const emptyOutput = {
      ...baseOutput,
      ranking: [],
      bestUrl: "",
      worstUrl: "",
    };

    render(<PageComparisonChart output={emptyOutput} />);

    expect(screen.getByRole("figure")).toBeInTheDocument();
    expect(screen.getByText(/Pages by Heading structure issues/i)).toBeInTheDocument();
  });
});