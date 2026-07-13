/**
 * Per-IP rate limiter + tag-level cooldown — reference implementation for
 * CTRL-OBSERV / CTRL-LLM. Generalized from production code.
 *
 * In-memory: each serverless instance has its own map. Single-region: one
 * instance is representative. Multi-region: swap the maps for Redis (Upstash /
 * Vercel KV). This is a documented trade-off, not a bug — state it in your
 * threat model rather than pretending the limit is globally exact.
 *
 * IP hashing: raw IPs are PII under GDPR/CCPA. We HMAC-SHA256 the IP with a
 * server-side pepper (IP_HASH_PEPPER) so logs carry a stable, irreversible
 * identifier. Rotate the pepper alongside your other secrets.
 */

import { createHmac } from "node:crypto";

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 request per 60s per IP
const COOLDOWN_MS = 30_000;          // 30s between expensive actions, regardless of IP
const MAX_MAP_SIZE = 10_000;         // evict oldest entries if the map grows unbounded

// Dev fallback keeps local hashes stable. In production, SET IP_HASH_PEPPER.
const PEPPER = process.env.IP_HASH_PEPPER ?? "dev-pepper-not-for-production";

/** HMAC-SHA256 of the raw IP with the server-side pepper. Never log a raw IP. */
export function hashIp(rawIp: string): string {
  return createHmac("sha256", PEPPER).update(rawIp).digest("hex");
}

/** Leftmost public IP from x-forwarded-for, falling back to x-real-ip. */
export function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0].trim(); // "client, proxy1, proxy2" → client
    if (first) return first;
  }
  return headers.get("x-real-ip") ?? "unknown";
}

const ipLastRequest = new Map<string, number>();

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

/** Allow one request per window per IP hash. Records the request when allowed. */
export function checkRateLimit(ipHash: string): RateLimitResult {
  const now = Date.now();
  const last = ipLastRequest.get(ipHash);

  if (last && now - last < RATE_LIMIT_WINDOW_MS) {
    const retryAfterMs = RATE_LIMIT_WINDOW_MS - (now - last);
    return { allowed: false, retryAfterSeconds: Math.ceil(retryAfterMs / 1000) };
  }

  // Cold-start protection: bound the map size.
  if (ipLastRequest.size >= MAX_MAP_SIZE) {
    const oldest = ipLastRequest.keys().next().value;
    if (oldest !== undefined) ipLastRequest.delete(oldest);
  }

  ipLastRequest.set(ipHash, now);
  return { allowed: true };
}

let lastActionAt = 0;

export type CooldownResult =
  | { cooledDown: false }
  | { cooledDown: true; secondsAgo: number };

/** Short-circuit if an expensive shared action ran too recently. */
export function checkCooldown(): CooldownResult {
  const now = Date.now();
  const elapsed = now - lastActionAt;
  if (lastActionAt > 0 && elapsed < COOLDOWN_MS) {
    return { cooledDown: true, secondsAgo: Math.round(elapsed / 1000) };
  }
  return { cooledDown: false };
}

/** Record that the expensive action just ran. Call AFTER it succeeds. */
export function recordAction(): void {
  lastActionAt = Date.now();
}
