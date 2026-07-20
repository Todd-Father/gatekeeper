# Gatekeeper

**A reusable method for shipping AI-built software without shipping AI-built vulnerabilities.**

The build is now free. An agent scaffolds a payment flow, an auth layer, a multi-tenant
schema in minutes. What the agent does *not* have is the judgment to know whether that
code is safe to ship. Gatekeeper is that judgment, written down: a fixed set of controls,
a way to wire them into CI as a hard gate, and an interview you have to pass out loud
before money or identity touches your app.

It was extracted from a real production codebase (a solo-built Next.js app that went
through exactly this gate before its first Stripe PR). Every control here is code that
shipped, broke, or held under attack — not generic advice. Where a control has a scar,
the scar is documented, because the scar is the most useful part.

## The one idea

> This is a gate, not a milestone. The temptation to ship a "small feature" ahead of the
> gate is the most common way I have watched this go wrong.

A milestone is something you pass. A gate refuses to open until conditions are met. Before
any money-touching or auth-touching code merges to `main`, every applicable control below
must be green **and** you must be able to answer the [defensibility interview](docs/defensibility-interview.md)
without hedging. AI generates code that *looks* done. The gate is what separates
looks-done from is-safe.

## How to use it

1. **Threat-model the surface.** What money, identity, or tenant boundary does this change
   touch? That selects which controls are in scope. Start from [`docs/threat-model-template.md`](docs/threat-model-template.md).
2. **Instantiate the five lenses.** Every surface gets examined through the same five
   ([`docs/five-lenses.md`](docs/five-lenses.md)): boundary, secrets, authority,
   observability, adversarial proof.
3. **Wire the gate.** Copy the CI checks from [`ci-templates/`](ci-templates/) and the
   readiness checklist from [`docs/readiness-checklist-template.md`](docs/readiness-checklist-template.md).
   The gate stays shut until every box is green.
4. **Sit the defensibility interview.** [`docs/defensibility-interview.md`](docs/defensibility-interview.md).
   Every unanswerable question is an unshipped gate — fix the gate, not the answer.
5. **Prove it, then let the checklist die.** Run the clean window and the attack scripts.
   When the phase is stable for 30 days, archive the completed checklist as the audit
   trail and start the next one.

## The control catalog

Each control is a self-contained file in [`controls/`](controls/) with the same shape:
*what · why · historical incident · implementation · how to prove it · status.*

| ID | Control | Lens |
|----|---------|------|
| [`CTRL-CSP`](controls/CTRL-CSP.md) | Strict CSP, no `unsafe-inline` in `script-src` | Authority |
| [`CTRL-HOOK`](controls/CTRL-HOOK.md) | Webhook signature verification as line 1 | Boundary |
| [`CTRL-EDGE`](controls/CTRL-EDGE.md) | Validate untrusted input at the edge, fail closed | Boundary |
| [`CTRL-SECRET`](controls/CTRL-SECRET.md) | Two-layer secret scanning + rehearsed rotation | Secrets |
| [`CTRL-SUPPLY`](controls/CTRL-SUPPLY.md) | Lockfile integrity + no post-install scripts | Secrets |
| [`CTRL-TENANT`](controls/CTRL-TENANT.md) | Tenant isolation proven by attack, not assertion | Authority |
| [`CTRL-ACCESS`](controls/CTRL-ACCESS.md) | Authorize every object access by the caller (kills IDOR + flow bypass) | Authority |
| [`CTRL-LLM`](controls/CTRL-LLM.md) | Treat model output as hostile input | Boundary |
| [`CTRL-OBSERV`](controls/CTRL-OBSERV.md) | Every control emits a signal you can see | Observability |

## What Gatekeeper is not

- **Not a milestone checklist you tick once.** It's a gate you re-run per surface.
- **Not a vulnerability scanner.** Scanners find known-bad patterns. Gatekeeper enforces
  a posture and forces you to defend it.
- **Not a substitute for judgment.** The defensibility interview is deliberately something
  a human answers out loud. If an agent could pass it, it wouldn't be the gate.

## Provenance

Controls, quotes, and incident notes are generalized from a real codebase's security
track. The `lib/` reference implementations are lightly de-specialized versions of code
running in production. See [`docs/provenance.md`](docs/provenance.md).

## License

MIT. Take it, fork it, wire it into your own gate.
