"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import ReactMarkdown, { type Components } from "react-markdown";
import { ChevronDown, Loader2, RotateCcw, Send, Sparkles, Square, TriangleAlert, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AuditResult } from "@/lib/audit-types";
import {
  CHAT_DOMAIN_KEY,
  CHAT_STORAGE_KEY,
  loadAuditResult,
} from "@/lib/audit-storage";
import {
  COMPARE_PAGES_TOOL_NAME,
  type ComparePagesMetric,
  type ComparePagesOutput,
} from "@/lib/ai/compare-pages.tool";
import {
  METRIC_LABELS,
  PageComparisonChart,
} from "@/components/page-comparison-chart";
import { cn } from "@/lib/utils";

const AUTO_START_PROMPT =
  "Summarize this audit in plain language for a non-technical site owner.";

// Aliases so the rest of this file reads naturally; the canonical values
// live in audit-storage (shared with clearAuditStorage).
const STORAGE_KEY = CHAT_STORAGE_KEY;
// Domain the cached conversation belongs to — used to invalidate the
// cache when the user audits a different site.
const DOMAIN_KEY = CHAT_DOMAIN_KEY;

// Module-level guard so the summary is only auto-started once per page
// load (React StrictMode re-runs effects in development). Reset on
// unmount so a fresh audit on a new domain can auto-start again.
let autoStarted = false;

const markdownComponents: Components = {
  p: ({ children }) => <p>{children}</p>,
  ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => (
    <ol className="list-decimal space-y-1 pl-5">{children}</ol>
  ),
  li: ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline underline-offset-2"
    >
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-background/70 px-1 py-0.5 font-mono text-[0.9em]">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mt-1.5 overflow-x-auto rounded-lg bg-background/70 p-2.5">
      {children}
    </pre>
  ),
};

/**
 * Structural view of a `comparePages` tool part. The AI SDK streams tool
 * calls as `tool-comparePages` parts (or `dynamic-tool` with a matching
 * name); each carries one of four states. Runtime guards only — the SDK's
 * part union is generic, so this never assumes a shape it can't verify.
 */
interface ComparePagesPartView {
  toolCallId: string;
  state:
    | "input-streaming"
    | "input-available"
    | "output-available"
    | "output-error";
  input?: { metric?: unknown };
  output?: unknown;
  errorText?: string;
}

function asComparePagesPart(part: unknown): ComparePagesPartView | null {
  if (typeof part !== "object" || part === null) return null;
  const p = part as Record<string, unknown>;
  const isNamed = p.type === `tool-${COMPARE_PAGES_TOOL_NAME}`;
  const isDynamic =
    p.type === "dynamic-tool" && p.toolName === COMPARE_PAGES_TOOL_NAME;
  if (!isNamed && !isDynamic) return null;
  const state = p.state;
  if (
    state !== "input-streaming" &&
    state !== "input-available" &&
    state !== "output-available" &&
    state !== "output-error"
  ) {
    return null;
  }
  return {
    toolCallId: typeof p.toolCallId === "string" ? p.toolCallId : "",
    state,
    input:
      typeof p.input === "object" && p.input !== null
        ? (p.input as { metric?: unknown })
        : undefined,
    output: p.output,
    errorText: typeof p.errorText === "string" ? p.errorText : undefined,
  };
}

function metricLabel(metric: unknown): string {
  if (typeof metric !== "string") return "…";
  const labels = METRIC_LABELS as Record<string, string>;
  return labels[metric] ?? metric;
}

function asComparePagesOutput(value: unknown): ComparePagesOutput | null {
  if (typeof value !== "object" || value === null) return null;
  const o = value as Record<string, unknown>;
  if (typeof o.metric !== "string" || !Array.isArray(o.ranking)) return null;
  if (typeof o.bestUrl !== "string" || typeof o.worstUrl !== "string") {
    return null;
  }
  const ranking = o.ranking.every(
    (entry) =>
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as Record<string, unknown>).url === "string" &&
      typeof (entry as Record<string, unknown>).value === "number"
  )
    ? (o.ranking as ComparePagesOutput["ranking"])
    : null;
  if (!ranking) return null;
  return {
    metric: o.metric as ComparePagesMetric,
    ranking,
    bestUrl: o.bestUrl,
    worstUrl: o.worstUrl,
    skippedCount:
      typeof o.skippedCount === "number" ? o.skippedCount : 0,
  };
}

/** Latest user-typed text, for the tool-error retry button. */
function lastUserText(messages: UIMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== "user") continue;
    const text = message.parts
      .filter(
        (part): part is { type: "text"; text: string } =>
          typeof part === "object" &&
          part !== null &&
          (part as Record<string, unknown>).type === "text" &&
          typeof (part as Record<string, unknown>).text === "string"
      )
      .map((part) => part.text)
      .join(" ")
      .trim();
    if (text.length > 0 && text !== AUTO_START_PROMPT) return text;
  }
  return null;
}

/**
 * Renders one `comparePages` tool part. Each of the four states is a
 * visually distinct answer to a different question — what it's doing,
 * with what input, what came back, what went wrong — and state changes
 * crossfade instead of swapping (keyed wrapper).
 */
function ComparePagesToolView({
  tool,
  onRetry,
}: {
  tool: ComparePagesPartView;
  onRetry: () => void;
}) {
  const output =
    tool.state === "output-available"
      ? asComparePagesOutput(tool.output)
      : null;

  return (
    <div
      key={`${tool.toolCallId}-${tool.state}`}
      className="w-full motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-98"
    >
      {tool.state === "input-streaming" && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-xs text-muted-foreground"
        >
          <Loader2
            aria-hidden="true"
            className="size-3.5 animate-spin text-primary motion-reduce:animate-none"
          />
          <span className="inline-flex items-baseline gap-1">
            Checking pages
            <span aria-hidden="true" className="flex gap-0.5">
              <span className="size-1 animate-bounce rounded-full bg-current motion-reduce:animate-none [animation-delay:-0.3s]" />
              <span className="size-1 animate-bounce rounded-full bg-current motion-reduce:animate-none [animation-delay:-0.15s]" />
              <span className="size-1 animate-bounce rounded-full bg-current motion-reduce:animate-none" />
            </span>
          </span>
        </div>
      )}

      {tool.state === "input-available" && (
        <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary">
          <ArrowLeftRight aria-hidden="true" className="size-3.5" />
          Comparing pages by {metricLabel(tool.input?.metric)}
        </p>
      )}

      {tool.state === "output-available" &&
        (output && output.ranking.length > 0 ? (
          <PageComparisonChart output={output} />
        ) : (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-bg px-3 py-2 text-xs text-warning"
          >
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            <p>
              The comparison came back empty — the pages may have failed to
              audit.{" "}
              <button
                type="button"
                onClick={onRetry}
                className="font-semibold underline underline-offset-2"
              >
                Try again
              </button>
            </p>
          </div>
        ))}

      {tool.state === "output-error" && (
        <div
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger-bg p-3"
        >
          <p className="flex items-start gap-2 text-xs font-semibold text-danger">
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            Couldn&apos;t compare pages
          </p>
          <p className="mt-1 text-xs text-danger/90">
            {tool.errorText ??
              "The comparison failed. This usually means the audit has no per-page data — re-running the audit fixes it."}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-2 h-7 text-xs"
          >
            <RotateCcw aria-hidden="true" className="size-3" />
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}

export function Chat({ audit: auditProp }: { audit?: AuditResult | null }) {
  const [input, setInput] = useState("");
  const [showJump, setShowJump] = useState(false);
  // Prefer the audit passed by the parent page (already loaded, no
  // storage race); fall back to sessionStorage for standalone use.
  const audit = auditProp ?? loadAuditResult();
  const auditDomain = audit?.url ?? "";
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const [wordCountCurrent, setWordCountCurrent] = useState(0);

  const { messages, sendMessage, stop, status, error, setMessages, clearError } =
    useChat({
      transport: new DefaultChatTransport({ api: "/api/chat" }),
      onError: () => {
        // Server errors are forwarded as user-facing messages via
        // `error`; nothing else to do here.
      },
    });

  const isGenerating = status === "submitted" || status === "streaming";
  const ready = status === "ready";

  // Hydrate a previously persisted conversation ONLY if it belongs to
  // the current audit's domain. Otherwise clear the stale cache and
  // auto-start a fresh summary for the new audit.
  useEffect(() => {
    const currentDomain = auditDomain;
    let storedDomain: string | null = null;
    try {
      storedDomain = sessionStorage.getItem(DOMAIN_KEY);
    } catch {
      // Storage may be unavailable; treat as a cache miss.
    }

    let saved: UIMessage[] | null = null;
    if (storedDomain && storedDomain === currentDomain && currentDomain) {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            saved = parsed;
            autoStarted = true;
          }
        }
      } catch {
        // Ignore malformed storage.
      }
    } else {
      // Different domain (or first audit) — drop the stale conversation
      // so the old site's summary can never leak into the new audit.
      try {
        sessionStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(DOMAIN_KEY);
      } catch {
        // Storage may be unavailable; nothing to clear.
      }
      autoStarted = false;
    }
    if (saved) {
      setMessages(saved);
    } else if (!autoStarted) {
      autoStarted = true;
      // Attach the real audit (if any) so the summary is grounded in
      // the user's actual results instead of mock data.
      void sendMessage(
        { text: AUTO_START_PROMPT },
        audit ? { body: { audit } } : undefined
      );
    }
  }, [setMessages, sendMessage, audit, auditDomain]);

  // Reset the module-level guard on unmount so navigating away and
  // auditing a new domain always gets a fresh auto-start.
  useEffect(() => {
    return () => {
      autoStarted = false;
    };
  }, []);

  // Persist the conversation (tagged with the audit domain) so it
  // survives navigation within the tab.
  useEffect(() => {
    if (messages.length > 0) {
      try {
        if (auditDomain) {
          sessionStorage.setItem(DOMAIN_KEY, auditDomain);
        }
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      } catch {
        // Storage may be unavailable; chat still works without it.
      }
    }
  }, [messages, auditDomain]);

  // Keep the newest message in view unless the user scrolled up.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  // Track word count in the latest assistant message for the 250-word limit.
  useEffect(() => {
    const countWords = (text: string) =>
      text
        .replace(/<[^>]*>/g, "")
        .match(/\S+/g)?.length || 0;

    const updateWordCount = () => {
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage || lastMessage.role !== "assistant") {
        setWordCountCurrent(0);
        return;
      }
      const text = lastMessage.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join(" ");
      const count = countWords(text);
      setWordCountCurrent(count);
    };

    updateWordCount();
    const handler = () => updateWordCount();
    const observer = new MutationObserver(handler);
    const target = scrollRef.current;
    if (target) observer.observe(target, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [messages, wordCountCurrent]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setShowJump(!stickToBottomRef.current);
  }

  function jumpToLatest() {
    const el = scrollRef.current;
    stickToBottomRef.current = true;
    setShowJump(false);
    if (el) el.scrollTop = el.scrollHeight;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || !ready) return;
    setInput("");
    void sendMessage({ text }, audit ? { body: { audit } } : undefined);
  }

  // Re-sends the user's last question so a failed tool call runs again.
  // The errored assistant message stays visible as history; the retry
  // produces a fresh answer below it.
  function handleToolRetry() {
    if (!ready) return;
    const text = lastUserText(messages);
    if (!text) return;
    void sendMessage({ text }, audit ? { body: { audit } } : undefined);
  }

  const lastMessage = messages[messages.length - 1];
  const lastAssistantHasText =
    lastMessage?.role === "assistant" &&
    lastMessage.parts.some(
      (part) => part.type === "text" && part.text.trim().length > 0
    );
  const showThinking = isGenerating && !lastAssistantHasText;

  return (
    <section
      aria-label="AI assistant chat"
      className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card"
    >
      <header className="flex items-center gap-2 border-b border-border px-5 py-3.5">
        <Sparkles aria-hidden="true" className="size-4 text-primary" />
        <h2 className="text-sm font-semibold text-card-foreground">
          Ask about your audit
        </h2>
        <span className="ml-auto text-xs text-muted-foreground">
          Powered by Gemini
        </span>
      </header>

      <div className="relative">
        <div
          role="log"
          aria-label="Conversation"
          aria-live="polite"
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex min-h-64 max-h-96 flex-col gap-4 overflow-y-auto px-5 py-4"
        >
          {messages.length === 0 && !isGenerating && (
            <p className="text-sm text-muted-foreground">
              Ask anything about your audit — what it means, what to fix first,
              or how to improve your score. You can also ask me to compare
              pages, e.g. “which page has the worst heading structure?”.
            </p>
          )}

          {messages.map((message) => {
            const isUser = message.role === "user";
            return (
              <div
                key={message.id}
                className={cn(
                  "flex w-full gap-2.5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1",
                  isUser ? "justify-end" : "justify-start motion-safe:zoom-in-98"
                )}
              >
                {!isUser && (
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
                  >
                    <Sparkles className="size-3.5" />
                  </span>
                )}
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed break-words sm:max-w-[75%]",
                    isUser
                      ? "rounded-br-md bg-primary text-primary-foreground whitespace-pre-wrap"
                      : "rounded-bl-md bg-muted text-foreground"
                  )}
                >
                  {message.parts.map((part, index) => {
                    const toolPart = asComparePagesPart(part);
                    if (toolPart) {
                      return isUser ? null : (
                        <ComparePagesToolView
                          key={toolPart.toolCallId || index}
                          tool={toolPart}
                          onRetry={handleToolRetry}
                        />
                      );
                    }
                    if (part.type !== "text") return null;
                    return isUser ? (
                      <span key={index}>{part.text}</span>
                    ) : (
                      <div key={index} className="space-y-1.5">
                        <ReactMarkdown components={markdownComponents}>
                          {part.text}
                        </ReactMarkdown>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

{showThinking && (
            <div className="flex w-full gap-2.5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95">
              <span
                aria-hidden="true"
                className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
              >
                <Sparkles className="size-3.5" />
              </span>
              <div className="rounded-2xl rounded-bl-md bg-muted px-3.5 py-2.5 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <span className="flex gap-1">
                    <span className="size-1.5 animate-bounce rounded-full bg-current motion-reduce:animate-none [animation-delay:-0.3s]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-current motion-reduce:animate-none [animation-delay:-0.15s]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-current motion-reduce:animate-none" />
                  </span>
                </span>
                <p className="text-xs text-muted-foreground">
                  The assistant is writing...{" "}
                  <span className="font-medium" id="word-count">
                    {wordCountCurrent}/250 words
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>

        {showJump && messages.length > 0 && (
          <button
            type="button"
            onClick={jumpToLatest}
            aria-label="Jump to latest"
            title="Jump to latest"
            className="absolute right-4 bottom-4 flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-card outline-none transition-colors hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:zoom-in-95"
          >
            <ChevronDown aria-hidden="true" className="size-4" />
          </button>
        )}
      </div>

      <span aria-live="polite" className="sr-only">
        {isGenerating
          ? "The assistant is writing."
          : status === "ready" && lastAssistantHasText
            ? "The assistant has finished replying."
            : ""}
      </span>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 border-t border-danger/20 bg-danger-bg px-5 py-3 text-sm text-danger"
        >
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p className="min-w-0 flex-1">
            {error.message || "Something went wrong. Please try again."}
          </p>
          <Button variant="ghost" size="sm" onClick={clearError}>
            Dismiss
          </Button>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-border p-3"
      >
        <label htmlFor="chat-input" className="sr-only">
          Ask a question about your audit
        </label>
        <input
          id="chat-input"
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={!ready}
          placeholder="Ask about your audit…"
          className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
        />
        {isGenerating ? (
          <Button
            key="stop"
            type="button"
            variant="outline"
            size="icon"
            onClick={() => void stop()}
            aria-label="Stop generating"
            title="Stop generating"
            className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95"
          >
            <Square aria-hidden="true" className="size-3.5" />
          </Button>
        ) : (
          <Button
            key="send"
            type="submit"
            size="icon"
            disabled={!ready || input.trim().length === 0}
            aria-label="Send message"
            className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95"
          >
            <Send aria-hidden="true" className="size-4" />
          </Button>
        )}
      </form>
    </section>
  );
}