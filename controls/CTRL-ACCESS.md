# CTRL-ACCESS — Authorize every object access by the requesting user

**Lens:** The client is never the authority (3) + Prove it under attack (5)
**Status:** shipped (extracted from a real IDOR + payment-bypass fix)

## What

Every request that reads or acts on a specific object must check that *the authenticated
caller is allowed that object* — server-side, on every access path, keyed to the caller's
identity. The object id in the URL, body, or token is an **input**, never proof of
ownership. This closes two of the most common real-world holes:

- **IDOR** (Insecure Direct Object Reference): `GET /report/1234` returns report 1234
  because it exists, not because *this* user owns it. Change the id, read someone else's data.
- **Function/flow bypass**: a paid or privileged action (`POST /purchase`, an admin route)
  that checks *whether you asked* but not *whether you're entitled* — e.g. a "payment-free
  purchase" where the entitlement is granted before payment is confirmed.

This is distinct from [`CTRL-TENANT`](CTRL-TENANT.md): tenancy isolates whole tenants at the
database (RLS); CTRL-ACCESS authorizes an *individual caller against an individual object or
action*, at the application boundary, even within a single tenant.

## Why

These bugs are invisible in the happy path — the app works perfectly for a user accessing
their own things, so tests written from the user's point of view never catch them. They only
appear when someone changes an id or skips a step. And they're exactly the class an agent
introduces without noticing: it wires `GET /report/{id}` to `SELECT … WHERE id = {id}` and
moves on, because "does this user own it?" was never in the prompt. The object id feels like
authorization because it's specific — but specificity is not entitlement.

The `/purchase` variant is worse because it's silent *and* costs money: the feature ships,
demos fine, and the bypass is only found when someone reads the code or abuses it in
production. "We check the user is logged in" is not "we check the user paid."

## Implementation

- **Authorize on the object, not just the route.** After resolving the object, verify it
  belongs to (or is permitted for) the authenticated caller *before* returning it or acting
  on it. `owner_id == current_user` (or an explicit permission check) is the gate — the id in
  the request never is.
- **Deny by default.** The check is a positive allow; anything not explicitly permitted is
  403. No "if we didn't find a reason to block, allow."
- **Gate the entitlement, not the intent.** For paid/privileged flows, grant the outcome only
  after the entitlement is *confirmed* (payment captured, role verified) — never on the
  request alone. The confirmation is server-side and not client-supplied.
- **One choke point.** Centralize the check (a dependency / middleware / helper) so every new
  route inherits it rather than re-implementing — a per-route check is one forgotten route
  away from a leak, same failure mode as scattered tenant checks.

## How to prove it

Like [`CTRL-TENANT`](CTRL-TENANT.md), the proof is **committed attack scripts, green in CI**,
not an assertion:

- **Cross-user object read** — authenticate as user A, request user B's object by id, assert
  403 (not 200, not 404-that-leaks-existence).
- **Unauthenticated access** — hit the protected object/action with no session, assert 401/403.
- **Entitlement bypass** — attempt the paid/privileged action *without* the confirmed
  entitlement (no payment, wrong role), assert it's refused and no state changed.
- **Enumeration** — walk a range of ids as one user, assert every not-owned id is refused.

"We check ownership" is a claim; "here are the adversarial scripts that try the bypass and
all get 403, green in CI" is evidence. When someone asks "can a user read another user's
report?", you point at the CI run.

## Defensibility interview question

**"A user changes the id in `/report/{id}` to one they don't own — what stops them? And what
stops a `/purchase` from granting access before payment clears?"**
→ Server-side ownership/entitlement check on every object access, deny-by-default, centralized
so no route can forget it — proven by committed attack scripts (cross-user read, entitlement
bypass, enumeration) that assert 403 and run in CI.
