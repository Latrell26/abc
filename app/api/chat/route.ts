import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { buildSystemPrompt, model } from "@/lib/ai/chat-config";
import { createComparePagesTool } from "@/lib/ai/compare-pages.tool";
import type { AuditResult } from "@/lib/audit-types";

/**
 * Streaming chat endpoint for the audit AI assistant.
 *
 * Accepts UIMessage[] from the client, converts them to model messages,
 * streams the model's reply back as a UI message stream so the client
 * gets token-by-token responses. The Gemini API key stays server-side.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

function friendlyError(error: unknown): string {
  if (error == null) return "The AI service is unavailable right now.";
  const text = error instanceof Error ? error.message : String(error);
  // Gemini free tier is strict; make rate limits easy to understand.
  if (/429|RESOURCE_EXHAUSTED|rate limit/i.test(text)) {
    return "The free AI service is rate-limited right now. Wait a minute and try again.";
  }
  // The most common self-service issue — the key is missing.
  if (/API key is missing/i.test(text)) {
    return "The Gemini API key isn't configured. Add GEMINI_API_KEY to .env.local and restart the server.";
  }
  // Don't leak provider error details to the client.
  return "The AI service had a problem. Please try again.";
}

function isAuditResult(value: unknown): value is AuditResult {
  if (typeof value !== "object" || value === null) return false;
  const audit = value as Record<string, unknown>;
  return (
    typeof audit.url === "string" &&
    typeof audit.overallScore === "number" &&
    typeof audit.pageSpeedScore === "number" &&
    Array.isArray(audit.checks) &&
    Array.isArray(audit.psiMetrics)
  );
}

export async function POST(req: Request) {
  const {
    messages,
    audit,
  }: { messages: UIMessage[]; audit?: unknown } = await req.json();

  if (!Array.isArray(messages)) {
    return Response.json({ error: "messages required" }, { status: 400 });
  }

  // The chat is only mounted when a real audit exists (the AI summary
  // page hides it otherwise), so a missing audit is a client error —
  // never fall back to fabricated data.
  const auditContext = isAuditResult(audit) ? audit : null;
  if (!auditContext) {
    return Response.json(
      { error: "No audit results found. Run an audit first." },
      { status: 400 }
    );
  }

  const result = streamText({
    model,
    system: buildSystemPrompt(auditContext),
    messages: await convertToModelMessages(messages),
    // The `comparePages` tool: lets the model answer "which page is
    // worst/best?" from the per-page data in this request. Multi-step so
    // the model sees the tool output and then writes its plain-language
    // follow-up — the client renders the tool lifecycle separately.
    tools: { comparePages: createComparePagesTool(auditContext.pages) },
    stopWhen: stepCountIs(3),
    // Lets the client's Stop button cancel the upstream request.
    abortSignal: req.signal,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: friendlyError,
    }),
  });
}
