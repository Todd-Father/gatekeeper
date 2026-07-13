# CTRL-OBSERV — Every control emits a signal you can see

**Lens:** A control you can't observe is a control you trust on faith (4)
**Status:** shipped

## What

Every control emits a **structured, greppable** event at the moment it acts, and those
events roll up into one operational view you can read on a phone in under ten seconds. Not
a log you `grep` after an incident — a dashboard tile you glance at before one.

Canonical events:

| Event | Fired by |
|-------|----------|
| `RATE_LIMIT_TRIGGERED` | rate limiter |
| `CSP_VIOLATION` | CSP report endpoint ([`CTRL-CSP`](CTRL-CSP.md)) |
| `UPSTREAM_VALIDATION_FAIL` | edge validation ([`CTRL-EDGE`](CTRL-EDGE.md)) |
| `WEBHOOK_SIG_FAIL` | webhook handler ([`CTRL-HOOK`](CTRL-HOOK.md)) |
| `LLM_OUTPUT_INVALID` | model output validation ([`CTRL-LLM`](CTRL-LLM.md)) |

## Why

> A CSP that reports nothing is a security control you trust on faith.

Without a reporting channel you cannot distinguish "no violations" from "violations
happening but invisible." The clean-window gate (lens 5) is impossible without it — you'd
be certifying silence you can't measure. And observability added retroactively is always
worse than observability added at write-time: the cost to emit `RATE_LIMIT_TRIGGERED` when
you write the limiter is zero; the cost to retrofit it after a Saturday-night incident is a
weekend of guessing whether the limiter ever worked.

## Implementation

- Every control logs a single-line JSON event with a stable `event` field and a timestamp.
  No raw PII — hash IPs and user agents (see [`../lib/rate-limit.ts`](../lib/rate-limit.ts)).
- A reporting endpoint (for browser-sent events like CSP violations) validates, rate-limits,
  logs the structured event, and writes a best-effort queryable projection to a store. The
  store write **never** fails the report response — the log line is the source of truth.
- One admin/health view shows, at minimum: healthcheck status, rate-limit triggers (24h),
  CSP violations (today / 24h / 7d + recent log), upstream validation failures (24h), and
  deploy status.

See [`../lib/csp-report-endpoint.ts`](../lib/csp-report-endpoint.ts) for a reference
reporting endpoint that ties the pattern together.

## How to prove it

Trigger each control deliberately (exceed the rate limit, POST a fake CSP violation, feed
malformed upstream data) and confirm the event appears in the log **and** the count moves
on the health view. A control whose signal you can't produce on demand hasn't met this bar.
