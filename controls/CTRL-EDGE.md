# CTRL-EDGE — Validate untrusted input at the edge, fail closed

**Lens:** Trust the boundary, not the payload (1)
**Status:** shipped

## What

Every response from an upstream you don't control (a third-party API, a scraper target) is
validated with a schema at the fetcher, before its data is used. On validation failure the
fetcher returns a **degraded sentinel** — a safe, known value — and logs a structured
event. It never throws an unhandled error a caller might swallow, and it never passes
unvalidated data downstream.

## Why

Upstream APIs change, return errors shaped like success, or get man-in-the-middled. Code
that assumes the shape of an upstream response is code that breaks (or worse, silently
mis-behaves) the day the upstream drifts. Validating at the edge means one place to reason
about "what if this is malformed," and failing closed means malformed data degrades the
feature instead of corrupting state.

## Implementation

```ts
import { z } from "zod";

// Validate only the fields you read. .passthrough() tolerates upstream field drift.
const ForecastSchema = z.object({
  temperature: z.number(),
  windSpeed: z.number(),
}).passthrough();

export async function getForecast(): Promise<Forecast> {
  const res = await fetch(UPSTREAM_URL);
  const parsed = ForecastSchema.safeParse(await res.json());
  if (!parsed.success) {
    console.log(JSON.stringify({
      event: "UPSTREAM_VALIDATION_FAIL",
      source: "forecast",
      ts: new Date().toISOString(),
    }));
    return DEGRADED_FORECAST;           // safe sentinel — feature degrades, state stays clean
  }
  return parsed.data;
}
```

Two design rules that keep this maintainable:

- **Validate only the fields you actually read.** Use `.passthrough()` so upstream adding a
  field never breaks your parse.
- **Surface the failure count on your healthcheck** so [`CTRL-OBSERV`](CTRL-OBSERV.md) can
  show "N validation failures in the last hour, by source."

## How to prove it

Point the fetcher at a fixture that returns malformed JSON (wrong types, missing fields).
Confirm it returns the degraded sentinel, logs `UPSTREAM_VALIDATION_FAIL`, and does **not**
throw or persist bad data. Keep this fixture as a committed test.
