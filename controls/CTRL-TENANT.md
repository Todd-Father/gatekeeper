# CTRL-TENANT — Tenant isolation proven by attack, not assertion

**Lens:** The client is never the authority (3) + Prove it under attack (5)
**Status:** shipped (multi-tenant app), with committed attack evidence

## What

In a multi-tenant system, the isolation boundary is enforced at the **database** via
row-level security (RLS), not in the application layer. The client's claimed tenant
identity is an *input* to the policy, never the authority. And the boundary is **proven by
committed adversarial scripts that run in CI** — not asserted in a design doc.

## Why

App-layer tenant checks (`WHERE tenant_id = ?` scattered through the code) are one missed
query away from a cross-tenant leak, and an agent writing a new query has no reason to
remember the check. RLS makes the database refuse cross-tenant reads regardless of what the
app forgets. But RLS is famously easy to *think* you've enabled while a bypass remains — a
table with `FORCE ROW LEVEL SECURITY` missing, an owner-role bypass, a connection-pool
reuse leaking one tenant's session to another. The only way to know it holds is to attack
it.

## Implementation

Enable RLS **and** `FORCE ROW LEVEL SECURITY` (so the table owner is also constrained), set
the tenant context per request, and then commit a battery of attack scripts as evidence:

- **Direct cross-tenant read** — set tenant A's context, attempt to select tenant B's rows,
  assert zero rows.
- **Owner-role bypass** — connect as the table owner, confirm `FORCE RLS` still constrains.
- **Connection-reuse leak** — a script that reuses a pooled connection across two tenant
  contexts and asserts the second context can't see the first's data (this is the subtle
  one; pooled connections are where "isolated" apps leak).
- **Privilege-tier attacks** — operator/curator/admin roles probed against the policy.

A CI gate runs these attack scripts on every build. If any assertion that *should* return
zero rows returns data, the build fails.

## How to prove it

The proof *is* the attack scripts, green in CI. That's the whole point of this control:
"we enabled RLS" is a claim; "here are eight committed adversarial scripts, all asserting
isolation, all green in CI" is evidence. Keep the scripts in the repo as the audit trail —
when someone asks "how do you know tenants are isolated," you point at the CI run, not a
paragraph.
