# Provenance

Gatekeeper is not generic security advice. Every control, quote, incident note, and
reference implementation was extracted and generalized from a real production codebase — a
solo-built Next.js app that went through exactly this gate before its first payment PR — and
its sibling projects (a multi-tenant B2B app, a consumer app with a hardening migration).

What was generalized, and how:

- **The control catalog** (`controls/`) preserves the original *what · why · historical
  incident · status* structure verbatim in spirit. The British Airways / Magecart incident
  note, the "CSP that reports nothing is trust on faith" line, and the "gate, not a
  milestone" framing are from the source repo's own security docs.

- **The CTRL-CSP scar** — the `experimental.sri` build-time-hashing failure against a
  runtime-injecting renderer, the revert, and the "validate on preview, not localhost"
  lesson — is a real production incident, kept because it's the most instructive artifact in
  the whole framework: it's the exact failure mode AI-generated security config produces.

- **The reference implementations** (`lib/`) are lightly de-specialized versions of code
  that ran in production: the per-IP rate limiter with pepper-hashed IPs, and the CSP report
  endpoint with dual-format zod validation. App-specific details (env-var names, domain
  pins, store wiring) were replaced with documented placeholders.

- **The CI templates** (`ci-templates/`) are the real workflow jobs, with app-specific jobs
  removed and secret names templated. The gitleaks force-push-proof range and the
  "never `|| true` the audit" rule both come from real false-red-X and silently-disabled-gate
  incidents in the source repo.

- **The threat-model and readiness templates** are generalized from the source repo's
  `threat-model-review.md` (two "distinguished engineer" review briefs) and
  `phase-1-readiness.md`. The phase-discipline framing — "treat the CSP as the gate to
  Phase 1, not a task inside it" — is a direct lift of that reviewer's core recommendation.

The method predates this repo; it just hadn't been named and lifted out of the app. This is
that extraction.
