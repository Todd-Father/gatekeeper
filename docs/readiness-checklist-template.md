# Phase Readiness Checklist — TEMPLATE

Copy this into your repo (e.g. `docs/security/phase-1-readiness.md`) and fill it in per
phase. **A phase = a surface where the stakes step up** — first paid route, auth going
live, first multi-tenant read. Until every hard gate below is checked, the phase has not
started. This is a gate, not a milestone.

> The temptation to ship a "small feature" ahead of the gate is the most common way this
> goes wrong. Name the phase, then hold the line.

---

## Hard gates (non-negotiable — nothing in this phase merges until all green)

- [ ] **CTRL-CSP** — strict CSP live on production; `'unsafe-inline'` gone from `script-src`;
      validated on a **preview deploy**, not localhost.
- [ ] **CTRL-OBSERV** — violation/observability endpoint live and logging.
- [ ] **Clean window** — N consecutive days of zero `script-src` violations on production.
      Clock starts when CTRL-CSP + CTRL-OBSERV are both live. (Recommended: 7 days.)
- [ ] **CTRL-EDGE** — every untrusted upstream is schema-validated at the fetcher, fails closed.
- [ ] **CTRL-SECRET** — no client-prefixed secrets (lint-enforced); two-layer scanning green;
      rotation runbook **rehearsed and timed under one hour**.
- [ ] **CTRL-SUPPLY** — lockfile-integrity + `--ignore-scripts` + audit gate all green, no `|| true`.
- [ ] **Operational view** — one screen showing healthcheck, rate-limit triggers (24h),
      violations (24h), validation failures (24h), deploy status. Readable on a phone in <10s.

## Soft gates (ship with the specific integration)

### Payments
- [ ] **CTRL-HOOK** — webhook signature is line 1; raw body, not parsed JSON.
- [ ] Idempotency by event id; dedupe tested.
- [ ] Payment-provider CSP domains staged behind a feature flag, flipped on at the same deploy.
- [ ] Fraud/risk tooling enabled.
- [ ] Secret key is server-only (no client prefix); rotation documented.

### Auth
- [ ] Session cookies: `HttpOnly`, `Secure`, `SameSite=Lax`.
- [ ] Authz in middleware on every protected route. No client-side gating.
- [ ] Auth-provider CSP domains staged behind a feature flag.
- [ ] Secret key rotation documented.

### LLM features — **CTRL-LLM**
- [ ] System prompt server-only; never echoed to the client.
- [ ] Input: length cap + injection-pattern filter on user fields.
- [ ] Output: schema-validated before render; fail closed.
- [ ] Per-IP + per-user rate limit; token budget + wall-clock timeout per call.
- [ ] Logs `request_id`, prompt **hash** (not content), model, latency, tokens.

### Multi-tenant — **CTRL-TENANT**
- [ ] RLS + `FORCE ROW LEVEL SECURITY` enabled.
- [ ] Attack scripts committed and green in CI (cross-tenant read, owner bypass,
      connection-reuse leak, privilege-tier probes).

## Defensibility interview

- [ ] Passed — every question in [`defensibility-interview.md`](defensibility-interview.md)
      answered out loud, no hedging. Date: __________

## How this file dies

When the phase is live and stable for 30 days, archive this completed checklist under
`docs/security/archive/phase-N-readiness-YYYY-MM-DD.md` and start the next one. **Do not
delete** — the completed checklist is the audit trail.
