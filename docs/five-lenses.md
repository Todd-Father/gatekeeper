# The Five Lenses

Every new surface — a route, a webhook, a schema, an LLM call — gets examined through the
same five lenses. They're the reusable part of the method: the specific controls change
with the stack, but the questions don't. If you can only remember one thing from
Gatekeeper, remember these five and the order.

---

## 1. Trust the boundary, not the payload

Every input from outside the trust boundary — an upstream API response, a webhook body, a
user form field, a model's output — is validated at the edge and **fails closed**. Not
"validated eventually, deep in a handler." At the edge, before business logic runs, with a
schema, returning a safe degraded value or a hard rejection on failure.

- Webhook signature verification is *line 1* of the handler, before any parsing of intent.
- Upstream JSON is schema-checked at the fetcher; on failure it returns a degraded
  sentinel, never a throw that a caller might swallow.
- Model output is schema-validated before it's rendered or acted on.

**Controls:** [`CTRL-HOOK`](../controls/CTRL-HOOK.md), [`CTRL-EDGE`](../controls/CTRL-EDGE.md), [`CTRL-LLM`](../controls/CTRL-LLM.md)

## 2. Secrets are server-only, scanned, and rotatable in under an hour

A secret's blast radius is measured in the time between leak and rotation. Three moves:
keep secrets off the client (an ESLint ratchet that fails the build on a `NEXT_PUBLIC_`
prefix on a secret key), scan for them at two layers (pre-commit + CI), and rehearse
rotation so "under one hour" is a proven fact, not a hope.

Waivers for known-dead findings are allowlisted by *exact commit*, never by lowering the
scan scope. The narrowest possible waiver keeps the gate real.

**Controls:** [`CTRL-SECRET`](../controls/CTRL-SECRET.md), [`CTRL-SUPPLY`](../controls/CTRL-SUPPLY.md)

## 3. The client is never the authority

Authorization decisions live server-side — in middleware, or in the database. Never in the
browser, never in a component that a `curl` can skip. The strict CSP is this lens applied
to script execution: with no `unsafe-inline` in `script-src`, an injected script has no
valid nonce and simply doesn't run. Multi-tenant isolation is this lens applied to data:
the row-level policy is the authority, and the client's claimed identity is just an input
to it.

**Controls:** [`CTRL-CSP`](../controls/CTRL-CSP.md), [`CTRL-TENANT`](../controls/CTRL-TENANT.md)

## 4. A control you can't observe is a control you trust on faith

> A CSP that reports nothing is a security control you trust on faith.

Every control emits a structured, greppable signal at the moment it acts — a log line, a
metric, a dashboard tile. `RATE_LIMIT_TRIGGERED`. `CSP_VIOLATION`. `UPSTREAM_VALIDATION_FAIL`.
Observability added retroactively is always worse than observability added when the control
is written; the cost to log at write-time is zero, the cost to retrofit after an incident
is a weekend. If you can't see the control working from a dashboard on a Saturday night,
it isn't a control — it's a prayer.

**Control:** [`CTRL-OBSERV`](../controls/CTRL-OBSERV.md)

## 5. Prove it under time and adversarial load before you monetize

Writing the control is not the same as watching it hold. Before the surface goes live with
real money or real identity:

- Run a **clean window** — e.g. seven consecutive days of zero `script-src` violations in
  production before the payment PR merges. The clock starts when the reporting endpoint is
  live, not when you wrote the CSP.
- Run the **attack scripts** — for a tenant boundary, that means actual adversarial SQL /
  connection-reuse probes committed to the repo and gated in CI, proving the boundary
  holds rather than asserting it does.
- Time the **rotation drill** — prove the secret is rotatable in under an hour by doing it.

"We wrote the control" is a claim. "We watched it hold under attack for seven days" is
evidence. The gate wants evidence.

---

## Applying the lenses

For any new surface, walk the five in order and write down the concrete control each one
demands *for this surface*. A payment webhook touches lenses 1 (verify signature), 2
(the webhook secret), 4 (log the verification result), and 5 (replay a mangled signature
and confirm 401). A multi-tenant read touches lenses 3 (RLS is the authority) and 5 (the
cross-tenant attack script). The output of this walk is your per-surface entry in the
[readiness checklist](readiness-checklist-template.md).
