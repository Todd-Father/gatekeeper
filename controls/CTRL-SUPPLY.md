# CTRL-SUPPLY — Lockfile integrity + no post-install scripts

**Lens:** Secrets are server-only, scanned, rotatable (2) — supply-chain edge
**Status:** shipped

## What

CI installs with `npm ci --ignore-scripts` (or the equivalent for your package manager),
and a dependency audit gate fails the build on any high/critical CVE in a **production**
dependency. Two properties fall out of `npm ci --ignore-scripts`:

1. **Lockfile integrity.** `npm ci` exits non-zero if `package-lock.json` is missing or out
   of sync with `package.json`. Every PR touching `package.json` must include the matching
   lockfile update in the same diff, or CI fails.
2. **No post-install execution.** `--ignore-scripts` blocks `preinstall`/`postinstall`
   hooks — a common supply-chain vector where a dependency ships a malicious install hook.

## Why

Agent-assisted development lands dependencies fast. A model will happily add a package to
solve a problem; it has no instinct for whether that package's maintainer is trustworthy or
whether it runs code at install time. Lockfile integrity makes every dependency change
visible in review. Blocking install scripts removes the most common way a compromised
transitive dep executes on your machine or in CI. The audit gate catches known CVEs that
rode along quietly.

## Implementation

```yaml
- name: lockfile-integrity
  run: npm ci --ignore-scripts       # fails if lockfile drifts; blocks install-time code

- name: npm audit (production deps, high+)
  run: npm audit --omit=dev --audit-level=high
```

Two rules learned the hard way:

- **Never blanket-bypass the audit with `|| true`.** A one-time waiver for a false positive
  silently disables the gate forever once the underlying advisory clears. If a specific
  advisory genuinely must be waived, allowlist *that GHSA id* in a pre-step with an
  expiry note — never `|| true` the whole command.
- If a dependency legitimately needs install scripts, document the exception inline in the
  workflow with the reason. Default is off.

Weekly automated dependency-update PRs (Dependabot or equivalent), grouped by ecosystem to
keep review noise low, are the companion to this gate — see
[`../ci-templates/dependabot.yml`](../ci-templates/dependabot.yml).

## How to prove it

Bump a dependency in `package.json` **without** updating the lockfile; confirm CI fails on
`lockfile-integrity`. Confirm the audit step is a real gate by checking it has no `|| true`
and a non-zero `--audit-level`.
