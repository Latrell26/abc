"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { scoreTone, type PsiMetric } from "@/lib/mock-audit";

const toneColors = {
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger: "var(--color-danger)",
} as const;

const toneLabels = {
  success: "Good",
  warning: "Needs improvement",
  danger: "Poor",
} as const;

export function SpeedChart({ metrics }: { metrics: PsiMetric[] }) {
  const data = metrics.map((m) => ({
    ...m,
    tone: scoreTone(m.score),
  }));

  return (
    <div className="w-full">
      <div
        role="img"
        aria-label="PageSpeed lab metrics chart"
        className="h-56 w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 12, bottom: 0, left: 0 }}
            barCategoryGap={12}
          >
            <XAxis
              type="number"
              domain={[0, 100]}
              hide
            />
            <YAxis
              type="category"
              dataKey="label"
              width={190}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: "var(--color-muted)", opacity: 0.5 }}
              formatter={(value) => [`${String(value)} / 100`, "Score"]}
              labelStyle={{ color: "var(--color-foreground)", fontWeight: 600 }}
              contentStyle={{
                background: "var(--color-popover)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                color: "var(--color-popover-foreground)",
              }}
            />
            <Bar dataKey="score" radius={4} barSize={18}>
              {data.map((entry) => (
                <Cell key={entry.id} fill={toneColors[entry.tone]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="sr-only">
        {metrics.map((m) => (
          <li key={m.id}>
            {m.label}: {m.value} — score {m.score} out of 100 ({toneLabels[scoreTone(m.score)]})
          </li>
        ))}
      </ul>
    </div>
  );
}