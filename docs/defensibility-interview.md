# The Defensibility Interview

This is the teeth of the method, and it's deliberately something a human answers **out
loud**. Before the first money-touching or auth-touching PR merges, you must be able to
answer each question below without hedging. Any question you can't answer cleanly is an
unshipped gate — the fix is to ship the gate, not to wordsmith the answer.

The framing that makes this work: imagine the question asked on stage, or in a post-incident
review, with the logs open. An answer that only sounds good until someone checks the code
is not a passing answer.

---

## The core questions

**An attacker lands an XSS payload in user input today. What stops it executing?**
→ Strict CSP; the injected `<script>` carries no valid nonce (and there is no
`'unsafe-inline'` in `script-src`), so the browser never runs it.

**A webhook arrives with a forged body. What stops you processing it?**
→ HMAC signature verification is line 1 of the handler; it fails and returns 401 before any
business logic runs. The handler reads the *raw* body, not re-serialized JSON.

**The model returns a prompt-injected response pretending to be structured output. What
stops it rendering?**
→ Schema validation on the model output; it fails closed. Unvalidated model text never
reaches a render path or a privileged action.

**A tenant tries to read another tenant's rows. What stops them?**
→ Row-level security is the authority, enforced at the database, not the app layer. It's
proven by committed attack scripts that run in CI — not asserted.

**A secret leaks into a diff. How long until it's rotated, and how do you know?**
→ Under one hour, per a runbook that has been rehearsed and timed. Two scan layers
(pre-commit + CI) make the leak visible; the drill makes the rotation fast.

**A compromised dependency ships a malicious post-install script. What stops it running in
CI?**
→ `npm ci --ignore-scripts`. Lockfile integrity means the dep can't change under you
without the lockfile diff showing up in review.

---

## The meta-question

For every control you claim, be ready for: **"Show me the signal that proves it fired."**
If the honest answer is "there isn't one," you've failed lens 4 (observability) and the
control is faith, not fact. Fix that before the interview, not during it.

## The "why did you ship it at all" question

Sometimes the defensible answer is a *sequenced* one. If you shipped a weaker posture
early (say, `unsafe-inline` while you had zero user-generated content), the defensible
answer is: *"We shipped it behind platform protections with zero content surface to exploit
it, a documented migration plan, and a named owner — and we removed it before introducing
any surface that could exploit it."* That answer only stays defensible if you actually
removed it before the content/auth surface shipped. Protect the answer by keeping the
sequence honest.

## How to run it

Read the questions aloud. If you hedge, stop and open the code. The hedge is the finding.
Record the pass in the readiness checklist with the date — the answered interview is part
of the audit trail.
