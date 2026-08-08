import { ResultsTabs } from "@/components/results-tabs";

export default function ResultsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex flex-col gap-6">
      <ResultsTabs />
      {children}
    </div>
  );
}
