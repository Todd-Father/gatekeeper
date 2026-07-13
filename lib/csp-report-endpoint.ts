/**
 * CSP violation reporting endpoint — reference implementation for CTRL-CSP +
 * CTRL-OBSERV. Generalized from production code.
 *
 * Accepts browser CSP violation reports, validates with zod, rate-limits
 * (reusing the CTRL-OBSERV limiter), and logs a structured `CSP_VIOLATION`
 * event. Supports both the legacy (application/csp-report) and modern
 * (application/reports+json) formats. Query strings are stripped from URIs to
 * reduce log noise and avoid leaking parameters. User agents are hashed, not
 * stored raw, to avoid fingerprinting.
 *
 * This endpoint is what makes the seven-day clean window measurable: without a
 * reporting channel you can't tell "no violations" from "violations you can't
 * see" (CTRL-CSP, lens 5).
 */

import { createHmac } from "node:crypto";
import { z } from "zod";
import { checkRateLimit, hashIp, getClientIp } from "./rate-limit";

const LegacyReportSchema = z.object({
  "csp-report": z
    .object({
      "document-uri": z.string().url().optional(),
      "violated-directive": z.string(),
      "effective-directive": z.string().optional(),
      "blocked-uri": z.string().optional(),
      "source-file": z.string().optional(),
      "line-number": z.number().optional(),
      "column-number": z.number().optional(),
      disposition: z.enum(["enforce", "report"]).optional(),
    })
    .passthrough(),
});

const ModernBody = z
  .object({
    "document-uri": z.string().optional(),
    "violated-directive": z.string().optional(),
    "effective-directive": z.string().optional(),
    "blocked-uri": z.string().optional(),
    "source-file": z.string().optional(),
    "line-number": z.number().optional(),
    "column-number": z.number().optional(),
    disposition: z.enum(["enforce", "report"]).optional(),
  })
  .passthrough();

const ModernReportSchema = z.array(
  z.object({ type: z.string(), url: z.string().optional(), body: ModernBody })
);

type Violation = z.infer<typeof ModernBody>;

function hashUserAgent(ua: string): string {
  const pepper = process.env.IP_HASH_PEPPER ?? "dev-pepper-not-for-production";
  return createHmac("sha256", pepper).update(ua).digest("hex").substring(0, 16);
}

function stripQuery(uri: string | undefined): string | undefined {
  if (!uri) return undefined;
  try {
    const u = new URL(uri);
    return u.origin + u.pathname;
  } catch {
    return uri; // directives like 'self' aren't URLs — pass through
  }
}

function logViolation(v: Violation, req: Request, ipHash: string): void {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      event: "CSP_VIOLATION",
      directive: v["violated-directive"],
      effective_directive: v["effective-directive"],
      blocked_uri: stripQuery(v["blocked-uri"]),
      source_file: stripQuery(v["source-file"]),
      line_number: v["line-number"],
      disposition: v.disposition ?? "enforce",
      document_uri: stripQuery(v["document-uri"]),
      user_agent_hash: hashUserAgent(req.headers.get("user-agent") ?? ""),
      ip_hash: ipHash,
    })
  );
  // In production, also write a best-effort queryable projection here for the
  // health dashboard. That write must NEVER fail the report response — the log
  // line above is the source of truth.
}

export async function POST(request: Request): Promise<Response> {
  const ipHash = hashIp(getClientIp(request.headers));
  const rl = checkRateLimit(ipHash);
  if (!rl.allowed) {
    return Response.json(
      { error: "rate limited" },
      { status: 429, headers: { "Retry-After": rl.retryAfterSeconds.toString() } }
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  try {
    const body = await request.json();
    if (contentType.includes("application/reports+json")) {
      for (const { body: v } of ModernReportSchema.parse(body)) logViolation(v, request, ipHash);
    } else {
      // Legacy format, or unknown content type falls back to legacy.
      logViolation(LegacyReportSchema.parse(body)["csp-report"], request, ipHash);
    }
    return new Response(null, { status: 204 });
  } catch (error) {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        event: "CSP_REPORT_PARSE_FAIL",
        error: error instanceof z.ZodError ? error.issues : String(error),
        ip_hash: ipHash,
      })
    );
    return Response.json({ error: "invalid payload" }, { status: 400 });
  }
}

export const maxDuration = 5;
