import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { buildSystemPrompt, model } from "@/lib/ai/chat-config";
import { mockAudit } from "@/lib/mock-audit";

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

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  if (!Array.isArray(messages)) {
    return Response.json({ error: "messages required" }, { status: 400 });
  }

  const result = streamText({
    model,
    system: buildSystemPrompt(mockAudit),
    messages: await convertToModelMessages(messages),
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
