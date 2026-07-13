# CTRL-LLM — Treat model output as hostile input

**Lens:** Trust the boundary, not the payload (1)
**Status:** pre-wired

## What

An LLM call is an untrusted boundary in **both directions**. On the way in: cap prompt
length, filter obvious injection patterns on user-controlled fields, and rate-limit per-IP
and per-user. On the way out: schema-validate the model's output before rendering it or
acting on it, and fail closed. The system prompt is server-only and never echoed to the
client. Every call has a token budget and a wall-clock timeout.

## Why

The model's output is not your code — it's data shaped by an input you don't fully control.
A prompt-injected user field can make the model emit text that *looks* like your structured
output but carries an instruction, a script, or a privileged action. If that output flows
straight to a render path or a tool call, the injection executes. Treating output as
hostile — validating it against the schema you expected — closes that path.

Rate limits and token budgets matter because an LLM endpoint is also a cost-amplification
target: an abusive client can run your bill up or exhaust your quota. Per-IP + per-user
limits and a hard token ceiling per call bound the damage.

## Implementation

```ts
// In: bound and screen the request.
if (userInput.length > MAX_PROMPT_CHARS) return reject("too long");
if (INJECTION_PATTERN.test(userInput)) log("LLM_INPUT_SUSPICIOUS", userInput);
const rl = checkRateLimit(hashIp(getClientIp(req.headers)));   // see lib/rate-limit
if (!rl.allowed) return rateLimited(rl);

// Call with a hard budget and timeout.
const out = await model.generate({ prompt, maxTokens: BUDGET, timeoutMs: WALL_CLOCK });

// Out: validate before use. Fail closed.
const parsed = ExpectedOutputSchema.safeParse(out.json);
if (!parsed.success) {
  log("LLM_OUTPUT_INVALID", parsed.error);
  return safeDefault;              // never render or act on unvalidated model text
}
```

Log `request_id`, a prompt **hash** (not content), model, latency, and token counts — so
[`CTRL-OBSERV`](CTRL-OBSERV.md) can see abuse and cost without persisting user prompts.

## How to prove it

Feed a prompt-injection fixture through the endpoint (a user field that tries to make the
model return an off-schema object or an embedded instruction). Confirm the output fails
schema validation and the safe default is returned — nothing injected reaches render.
Confirm the rate limit returns 429 on the N+1th request in the window.
