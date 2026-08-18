import type { Metadata } from "next";
import { headers } from "next/headers";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Health",
  description: "Health status of the deployed service and its integrations.",
};

export const dynamic = "force-dynamic";

type HealthData = {
  status: string;
  timestamp: string;
  region: string;
  env: {
    geminiConfigured: boolean;
    psiConfigured: boolean;
  };
};

async function getHealth(): Promise<HealthData> {
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") ?? "http";
  const res = await fetch(`${protocol}://${host}/api/health`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Health endpoint returned ${res.status}`);
  }
  return res.json() as Promise<HealthData>;
}

function StatusCard({ label, value }: { label: string; value: string }) {
  const ok = value.toLowerCase() === "ok" || value.toLowerCase() === "configured";
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-5 shadow-card">
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
          ok ? "bg-success-bg text-success" : "bg-danger-bg text-danger"
        )}
      >
        {ok ? (
          <CheckCircle2 className="size-4" />
        ) : (
          <XCircle className="size-4" />
        )}
      </span>
      <div>
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        <p
          className={cn(
            "mt-0.5 text-base font-bold",
            ok ? "text-success" : "text-foreground"
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

export default async function HealthPage() {
  let data: HealthData | null = null;
  let fetchError: string | null = null;

  try {
    data = await getHealth();
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "Unknown error";
  }

  return (
    <div className="flex flex-col items-start gap-6">
      <div>
        <p className="mb-2 inline-block rounded-full bg-muted px-3 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Health
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          System health
        </h1>
        <p className="mt-2 max-w-prose text-muted-foreground">
          Status of the deployed service and its external integrations.
        </p>
      </div>

      {data ? (
        <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatusCard label="Status" value={data.status} />
          <StatusCard label="Region" value={data.region} />
          <StatusCard
            label="Checked at"
            value={new Date(data.timestamp).toLocaleString()}
          />
          <StatusCard
            label="Gemini API key"
            value={data.env.geminiConfigured ? "Configured" : "Not set"}
          />
          <StatusCard
            label="PageSpeed API key"
            value={data.env.psiConfigured ? "Configured" : "Not set"}
          />
        </div>
      ) : (
        <div className="flex w-full items-center gap-3 rounded-xl border border-danger/30 bg-danger-bg px-4 py-3 text-danger">
          <XCircle aria-hidden="true" className="size-5 shrink-0" />
          <p className="text-sm">
            Failed to reach health endpoint: {fetchError}
          </p>
        </div>
      )}

      <p className="rounded-md bg-muted px-4 py-2 text-xs font-medium text-muted-foreground">
        Fetched server-side from /api/health — reports booleans only, never key
        values.
      </p>
    </div>
  );
}