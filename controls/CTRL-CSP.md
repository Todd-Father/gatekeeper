# CTRL-CSP — Strict CSP, no `unsafe-inline` in `script-src`

**Lens:** The client is never the authority (3)
**Status:** shipped, reverted, reopened — *the scar is the point*

## What

`script-src` must not contain `'unsafe-inline'`. Inline scripts are either eliminated or
carry a per-request nonce (or a pinned SHA-256 hash). An injected `<script>` has no valid
nonce, so the browser refuses to execute it.

## Why

`unsafe-inline` in `script-src` means any injected script tag executes — XSS becomes
trivially weaponizable. With a payment SDK (Stripe.js) on the page, an XSS payload can skim
card numbers from the form *before* they reach the SDK's iframe. A strict CSP is also how
you reduce PCI scope; the payment provider's own docs require it.

## Historical incident

British Airways, 2018 — Magecart injected a 22-line script into the checkout page. ~500,000
card numbers exfiltrated over 15 days. A strict CSP would have blocked the injected script
on first load.

## Implementation

Prefer a **per-request nonce** generated in middleware and propagated to the renderer, over
build-time hashing. Pin third-party origins (payment, auth, model API) behind feature flags
so they're added to the policy at the same deploy that turns the integration on.

## The scar (read this before you implement)

A first attempt used build-time Subresource Integrity (`experimental.sri`) to hash JS
chunks. It worked for statically built chunks — but a streaming/partial-prerender renderer
injects scripts **at runtime**, and those got no `integrity=` attribute, so the browser
blocked them and the page broke. It had to be reverted; `unsafe-inline` came back and the
issue reopened.

This is the single most valuable artifact in the catalog, because it's the *exact* failure
mode AI-generated CSP config produces: plausible-looking configuration that passes on
localhost and breaks under production rendering. Two lessons, both non-negotiable:

1. **Nonce, not build-time hash, when the renderer injects scripts at runtime.**
2. **Validate the CSP on a real preview deployment, never localhost.** The failure only
   appears when the production renderer runs.

## How to prove it

```
curl -sI https://your-app.example.com | grep -i content-security-policy
```

The `script-src` directive must show a nonce (or hashes) and **no** `'unsafe-inline'`.
Then confirm the page actually renders on the preview deploy — a strict CSP that white-
screens the app is not shipped, it's broken. Pair with [`CTRL-OBSERV`](CTRL-OBSERV.md):
the violation-reporting endpoint must be live and quiet for the clean window before a
payment PR merges.
