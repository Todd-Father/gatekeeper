# Threat Model — TEMPLATE

The threat model is an *architectural* artifact, not just a security one. It says: this is
what we protect, this is how, and — critically — this is **who operates it** and how it
fails. Keep it to one page. The output of filling it in is the list of controls in scope
for your [readiness checklist](readiness-checklist-template.md).

Written in the voice of a review, because a review is what forces the honest version.

---

## Model in one paragraph

*What is this system, who are the realistic adversaries, and what is the worst realistic
outcome in the current phase?* Name the phase explicitly (pre-auth / pre-payments? live
with revenue? multi-tenant?). Be concrete about adversaries — "opportunists, scrapers, and
abusive clickers" is a more useful threat model than "attackers." State the single worst
realistic outcome, because that's what the controls are bought against.

> _Example:_ A public consumer web app, currently pre-auth and pre-payments. Realistic
> adversaries are opportunists and scrapers, not nation-states. Worst realistic outcome
> today is a cache-amplification campaign against the refresh endpoint, an XSS chain landing
> via a stray `unsafe-inline` the day user input is introduced, or a secret leaking into the
> client bundle through an agent-generated diff.

## Phase discipline (the amendment that matters most)

*What changes the day the stakes step up?* Name the control that must become a **gate** to
the next phase rather than a task inside it.

> _The seductive wrong answer is "we'll harden it later." Phase transitions are the only
> reliable moment to enforce phase-level controls. Miss the transition and the control
> becomes a two-year backlog item. Pick the gate control now and hold it._

## Controls in scope

Walk the [five lenses](five-lenses.md) against this surface. For each, name the concrete
control this surface demands (or "N/A — no such surface yet").

| Lens | In scope? | Control for this surface |
|------|-----------|--------------------------|
| 1 · Trust the boundary | | |
| 2 · Secrets server-only | | |
| 3 · Client is never authority | | |
| 4 · Observe every control | | |
| 5 · Prove under attack | | |

## Operational reality check

- **Who operates this in 12 months?** (If the answer is "one person," every control must
  survive that constraint — no control that needs a team to run.)
- **How is each control tested?** Proof of execution, not documentation: a CI job going red,
  a `curl` returning 429, a replayed webhook returning 401. List the proof per control.
- **How is it rotated?** One rotation-runbook template, applied to each live secret.
- **How does it fail?** It should fail **loud** — 401s, 429s, CI red, console errors. Name
  any silent-failure path and close it.

## Sign-off

State the decision plainly: **YES / YES WITH CONDITIONS / NO**, and if conditions, list them
numbered. A conditional yes with three concrete conditions is a better artifact than an
unconditional yes.
