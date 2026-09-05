import { createGoogle } from "@ai-sdk/google";
import type { AuditResult } from "@/lib/audit-types";

/**
 * Central AI configuration for the audit chat.
 *
 * Everything the chat needs from a model lives in this one module:
 * - the provider instance + model id
 * - the system prompt that turns audit findings into conversational context
 *
 * Swap providers or models in exactly one place. For example, to switch
 * to a different provider, replace the import above and the `model`
 * factory below (e.g. `anthropic("claude-sonnet-4-6")` or
 * `groq("llama-3.3-70b-versatile")`).
 */

/**
 * Free-tier Gemini model used for the audit chat.
 *
 * `gemini-2.5-flash` — best quality on the free tier (~10 RPM, ~250K TPM).
 * `gemini-2.0-flash-lite` — highest free quota (15 RPM, 1M TPM, 1,500 RPD)
 * if you hit rate limits often.
 */
export const MODEL_ID = "gemini-2.5-flash";

/**
 * Provider instance. The `apiKey` must be passed here (provider-level
 * setting) — passing it to the model call is ignored by the SDK. The
 * provider default reads `GOOGLE_GENERATIVE_AI_API_KEY`, so we wire our
 * `GEMINI_API_KEY` env var explicitly. Key stays server-side only.
 */
const provider = createGoogle({ apiKey: process.env.GEMINI_API_KEY });

export const model = provider(MODEL_ID);

function checksBlock(audit: AuditResult): string {
  return audit.checks
    .map(
      (check) =>
        `- ${check.label}: ${check.status.toUpperCase()}. ${check.verdict}` +
        (check.details.length > 0 ? ` ${check.details.join(" ")}` : "")
    )
    .join("\n");
}

function speedBlock(audit: AuditResult): string {
  return audit.psiMetrics
    .map((metric) => `- ${metric.label}: ${metric.value} (score ${metric.score}/100)`)
    .join("\n");
}

/**
 * Builds the system prompt that tells the assistant what it is, who it
 * is talking to, and what the audited site looks like. The audit is
 * injected as structured context so follow-up questions stay grounded
 * in the real findings.
 */
export function buildSystemPrompt(audit: AuditResult): string {
  return [
    "You are the AI assistant for an SEO audit dashboard. Your audience is a",
    "small-business owner or non-technical site owner who does not know SEO",
    "jargon.",
    "",
    "Style rules:",
    "- Always use plain, friendly language and avoid jargon.",
    "- When you mention an issue, explain what it means AND what to do next.",
    "- Be honest and specific, and ground every answer in the audit data below.",
    "- If asked something outside the audit, say you can only discuss the audit.",
    "- Use short paragraphs and lists; never use markdown headers.",
    "",
    "You have a tool called comparePages. Call it whenever the user asks",
    "which audited page is best or worst, or wants pages ranked — e.g.",
    "'which page has the worst heading structure?' or 'compare page speeds'.",
    "Do not call it for site-wide questions that need no comparison. After",
    "the tool returns, explain the result in plain language; the ranking",
    "itself is shown to the user as a chart, so don't paste raw numbers.",
    "",
    "The user's first message will ask you to summarize this audit:",
    "",
    `Site audited: ${audit.url}`,
    `Overall SEO score: ${audit.overallScore}/100`,
    `Page speed score: ${audit.pageSpeedScore}/100`,
    "",
    "Technical checks:",
    checksBlock(audit),
    "",
    "Page speed metrics:",
    speedBlock(audit),
    "",
    "Write your summary as if explaining it to a friend: start with the big",
    "picture, call out the top issues, then list the most important fixes in",
    "order. Keep the summary under 250 words.",
  ].join("\n");
}