# CTRL-HOOK — Webhook signature verification as line 1

**Lens:** Trust the boundary, not the payload (1)
**Status:** pattern — wire before any webhook goes live

## What

Signature verification (`constructEvent(rawBody, signature, secret)` or equivalent) is the
**first** thing the handler does. No business logic — no user lookup, no DB write, no
entitlement change — runs before it. The handler reads the **raw request body**, not
re-parsed JSON.

## Why

Webhooks are unauthenticated HTTP POSTs. Anyone on the internet can send a forged one.
Without HMAC verification, a forged `checkout.session.completed` (or equivalent) upgrades a
non-paying user to paid, grants access, or triggers a payout.

Two ways this silently breaks:

1. **No verification at all** — the handler trusts the body.
2. **Verifying the parsed body** — `req.json()` re-serializes the payload, changing
   whitespace, which invalidates the signature *even for legitimate events*. Teams then
   "fix" the broken legit events by removing verification. Read the raw bytes.

## Historical incident

A large share of reported payment-integration breaches trace to exactly (1) or (2). Both
are silently exploitable — the happy path looks fine in every test that sends a
well-formed body.

## Implementation

```ts
export async function POST(req: Request): Promise<Response> {
  const raw = await req.text();                    // raw bytes, NOT req.json()
  const sig = req.headers.get("stripe-signature"); // or your provider's header
  let event;
  try {
    event = provider.webhooks.constructEvent(raw, sig, process.env.WEBHOOK_SECRET!);
  } catch {
    // Fail closed. No detail leaked. Nothing downstream ran.
    console.log(JSON.stringify({ event: "WEBHOOK_SIG_FAIL", ts: new Date().toISOString() }));
    return new Response("invalid signature", { status: 401 });
  }
  // Only now: idempotency check by event id, then business logic.
}
```

Pair with **idempotency by event id** — dedupe processed events so a replayed valid event
can't double-apply.

## How to prove it

Replay a webhook with a mangled signature (the provider CLI can do this) and confirm the
handler returns 401 **and** wrote no data. Then confirm a legitimate event succeeds — that
proves you're verifying raw bytes, not re-serialized JSON.
