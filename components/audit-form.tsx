"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
      className="flex w-full flex-col gap-3 sm:flex-row sm:items-start"
      noValidate
    >
      <div className="flex w-full flex-col gap-1">
        <input
          type="text"
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            if (error) setError(null);
          }}
          placeholder="https://example.com"
          aria-label="Website URL to audit"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "url-error" : undefined}
          className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {error ? (
          <p id="url-error" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
      </div>
      <button
        type="submit"
        className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        Run audit
      </button>
    </form>
  );
}
