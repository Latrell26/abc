"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearAuditStorage } from "@/lib/audit-storage";
import { parse } from "tldts";

const URL_PATTERN = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/i;

function getETLDPlus1(url: string): string {
  try {
    const parsed = parse(url);
    return parsed.domain || url;
  } catch {
    return url;
  }
}

export function AuditForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [domainError, setDomainError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = url.trim();
    if (!trimmed) {
      setError("Please enter a website URL.");
      setDomainError(null);
      return;
    }
    if (!URL_PATTERN.test(trimmed)) {
      setError("That doesn't look like a valid URL. Try e.g. example.com");
      setDomainError(null);
      return;
    }

    const submittedEtld = getETLDPlus1(trimmed);
    setError(null);

    if (trimmed.toLowerCase().startsWith("http")) {
      const urlObj = new URL(trimmed);
      const manualEtld = getETLDPlus1(urlObj.hostname);

      if (manualEtld !== submittedEtld) {
        setDomainError(
          `URL must be on the same site (e.g., sub.${submittedEtld}). Different registrable domains are not allowed.`
        );
        return;
      }
    } else {
      const manualEtld = getETLDPlus1(trimmed);
      if (manualEtld !== submittedEtld) {
        setDomainError(
          `URL must be on the same site (e.g., sub.${submittedEtld}). Different registrable domains are not allowed.`
        );
        return;
      }
    }

    setDomainError(null);
    // Drop any previous run (result + chat cache) so the loading screen
    // and dashboard can never render stale data from an older audit.
    clearAuditStorage();
    router.push(`/audit/loading?url=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full"
      noValidate
      aria-describedby={error ? "url-error" : undefined}
    >
      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <label htmlFor="audit-url" className="sr-only">
            Website URL to audit
          </label>
          <input
            id="audit-url"
            type="text"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              if (error) setError(null);
              if (domainError) setDomainError(null);
            }}
            placeholder="https://example.com"
            aria-invalid={error ? true : undefined}
            aria-describedby={
              error
                ? "url-error"
                : domainError
                  ? "domain-error"
                  : undefined}
            className="w-full rounded-xl border border-input bg-background py-3.5 pr-4 pl-11 text-base text-foreground shadow-sm transition placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20 dark:bg-card"
          />
        </div>
        <Button type="submit" size="lg" className="h-[3.25rem] px-6 text-base">
          Run audit
        </Button>
      </div>
      {error ? (
        <p id="url-error" role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {domainError ? (
        <p id="domain-error" role="alert" className="mt-2 text-sm text-danger">
          {domainError}
        </p>
      ) : null}
    </form>
  );
}