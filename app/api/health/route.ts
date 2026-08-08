export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    region: process.env.VERCEL_REGION ?? "local",
    env: {
      anthropicConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
      psiConfigured: Boolean(process.env.GOOGLE_PAGESPEED_API_KEY),
    },
  });
}
