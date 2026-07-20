# Gatekeeper

**What it is:** A reusable **security methodology** for shipping AI-built software without shipping AI-built vulnerabilities — a fixed set of controls, CI templates that wire them in as a hard gate, and a "defensibility interview" you must pass before money or identity touches an app. Extracted from a real production Next.js codebase (thirty-aye) that went through this exact gate before its first Stripe PR.
**Repo:** `Todd-Father/gatekeeper` (**public**)
**Canonical path:** `~/Projects/gatekeeper` (see ~/.claude/harness/canonical-paths.json)
**Tools wired:** GitHub (`gh` CLI) only. No build, deploy, or database — it's a Markdown methodology repo. ("Stripe" appears in the docs as the *example* domain, not a wired integration.)

> **This is a docs/methodology repo, not an application.** No build, no test suite, no dev server. The "product" is the controls, templates, and interview — Markdown and reference code meant to be copied into *other* projects.

## Layout
- `controls/` — one file per control (`CTRL-CSP`, `CTRL-EDGE`, `CTRL-HOOK`, `CTRL-LLM`, …). Each is a shippable control with its scar documented (what broke / held under attack).
- `ci-templates/` — drop-in CI: `secret-scan.yml`, `supply-chain.yml`, `dependabot.yml`, `pre-commit`. These are the hard gate.
- `lib/` — reference implementations (`csp-report-endpoint.ts`, `rate-limit.ts`) — real code that shipped, not pseudocode.
- `docs/` — `defensibility-interview.md`, `five-lenses.md`, `provenance.md`, `readiness-checklist-template.md`.

## The one idea
> This is a **gate, not a milestone.** The temptation to ship a "small feature" ahead of the gate is the most common way this goes wrong. Controls are code that shipped, broke, or held under attack — where a control has a scar, the scar is the most useful part.

## Working on this repo
- **Editing controls/docs:** keep the voice — concrete, scar-first, "this is what actually happened," never generic advice. Every claim should trace to real production experience.
- **Reference code in `lib/`:** it's illustrative but must be correct — it gets copied into real apps. Treat bugs here as production bugs.
- **Public repo — attribution:** handle-only (`Todd-Father`); never add Todd's real name unprompted. This is the identity/credibility play.

## Never do
- **No secrets, ever** — public repo. No `.env` values, tokens, or keys in any file (`.gitignore` blocks them; cloud-synced folders count as exposure too).
- Don't dilute a control with hedged/generic security advice — specificity and the documented scar are the whole value.
- Destructive/externally-visible actions (force-push, releases): propose first, verify, then act.

## Definition of Done (for a control or doc change)
1. Content is concrete and traceable to real experience (no generic filler)
2. Any reference code is correct and self-consistent
3. Cross-links between control ↔ interview ↔ checklist still resolve
4. No secrets introduced (the Stop hook runs `gitleaks protect --staged`)
