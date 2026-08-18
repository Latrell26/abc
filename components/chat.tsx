"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import ReactMarkdown, { type Components } from "react-markdown";
import { ChevronDown, Send, Sparkles, Square, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const AUTO_START_PROMPT =
  "Summarize this audit in plain language for a non-technical site owner.";

const STORAGE_KEY = "seo-audit-chat";

// Module-level guard so the summary is only auto-started once per page
// load (React StrictMode re-runs effects in development).
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

export function Chat() {
  const [input, setInput] = useState("");
  const [showJump, setShowJump] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

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

  // Hydrate a previously persisted conversation (survives tab switches),
  // otherwise auto-start the plain-language summary.
  useEffect(() => {
    let saved: UIMessage[] | null = null;
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
    if (saved) {
      setMessages(saved);
    } else if (!autoStarted) {
      autoStarted = true;
      void sendMessage({ text: AUTO_START_PROMPT });
    }
  }, [setMessages, sendMessage]);

  // Persist the conversation so it survives navigation within the tab.
  useEffect(() => {
    if (messages.length > 0) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      } catch {
        // Storage may be unavailable; chat still works without it.
      }
    }
  }, [messages]);

  // Keep the newest message in view unless the user scrolled up.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

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
    void sendMessage({ text });
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
              or how to improve your score.
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
                  Thinking…
                </span>
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