"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const URL_PATTERN = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/i;

export function AuditForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = url.trim();
    if (!trimmed) {
      setError("Please enter a website URL.");
      return;
    }
    if (!URL_PATTERN.test(trimmed)) {
      setError("That doesn't look like a valid URL. Try e.g. example.com");
      return;
    }

    setError(null);
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
            }}
            placeholder="https://example.com"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "url-error" : undefined}
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
    </form>
  );
}