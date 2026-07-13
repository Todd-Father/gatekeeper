# CTRL-SECRET — Two-layer secret scanning + rehearsed rotation

**Lens:** Secrets are server-only, scanned, rotatable in under an hour (2)
**Status:** shipped, battle-tested (caught a real leak)

## What

Three enforced properties:

1. **Server-only.** No secret carries a client-exposed prefix (`NEXT_PUBLIC_`, `VITE_`,
   etc.). An ESLint/lint rule fails the build if one does.
2. **Scanned at two layers.** A pre-commit hook scans the staged diff (fast, local,
   best-effort); a CI job scans the merge-base range on PRs and full history on `main`
   (authoritative gate).
3. **Rotatable in under an hour.** A documented, rehearsed runbook per secret. "Under one
   hour" is a timed fact, not a hope.

## Why

A leaked secret's damage is bounded by the time to rotation. Two scan layers minimize
time-to-*detection*; the rehearsed runbook minimizes time-to-*rotation*. The client-prefix
lint rule stops the most common agent-generated leak — a secret pulled into the client
bundle because the model didn't know the prefix was load-bearing.

## Historical incident (this control's own scar)

A debug commit once dumped an environment blob containing live cache credentials and a
short-lived OIDC token into the repo. The **full-history scan on `main`** surfaced it. The
credential was rotated; the token had already expired. The dead blob was then allowlisted
by **exact commit hash** — the narrowest possible waiver — so it doesn't fail every future
scan, while any *new* secret in any *other* commit still fails. That's the discipline: never
widen the waiver, never lower the scope to make the pipeline green.

## Implementation

- CI runs the scanner **CLI directly**, not a wrapper action, so you can pin a
  force-push-proof range. Wrapper actions that auto-compute a `<commit>^..<commit>` range
  can be orphaned by a rebase/force-push into an "unknown revision" error — a false red X
  with no override. Pin explicitly:
  - PRs: `origin/main...HEAD` (three-dot merge-base range; a force-pushed parent can't
    orphan it).
  - `main`: `--all` (full history).
- Pin the scanner binary version and verify its checksum before extracting.
- Allowlist config lives in the repo; every waiver has a comment explaining *why it's safe*.

See [`../ci-templates/secret-scan.yml`](../ci-templates/secret-scan.yml) and
[`../ci-templates/.gitleaks.toml`](../ci-templates/.gitleaks.toml) for the working versions.

## How to prove it

Commit a fake secret-shaped string on a branch and confirm CI's `secret-scan` job goes red.
Then run the rotation runbook end-to-end with a stopwatch and record the time. If it's over
an hour, the runbook is the finding.
