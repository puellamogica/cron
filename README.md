# puellamogica/cron

Cron trigger helper

A Cloudflare Worker that runs scheduled jobs.

It exposes no HTTP routes (`workers_dev` and `preview_urls` are disabled in
`wrangler.jsonc`); the only entry point is the `scheduled` handler in `src/index.ts`.

## Scheduled jobs

| Cron expression | Job                   | What it does                                                                                                        |
| --------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `8/10 * * * *`  | `syncWeather`         | Fetches current weather and alerts from OpenWeatherMap and writes `weather.json` to the `WEATHER_BUCKET` R2 bucket. |
| `56 * * * *`    | `clearExpiredUnlocks` | Deletes expired rows from the D1 `unlock` table.                                                                    |

Schedules live in `wrangler.jsonc` under `triggers.crons` and are wired to handlers in
`src/crons/index.ts`, where `runScheduled` dispatches the matching jobs.

## Bindings

Configured in `wrangler.jsonc`:

- `OPENWEATHERMAP_API_KEY` — Secrets Store secret
- `OPENWEATHERMAP_LAT`, `OPENWEATHERMAP_LON` — `vars`
- `WEATHER_BUCKET` — R2 bucket (`object`)
- `DB` — D1 database (`blog`); the `unlock` table has an `expireTime` column in epoch seconds

## Getting started

```txt
pnpm install
pnpm test
```

Run the Worker locally:

```txt
pnpm dev
```

Deploy:

```txt
pnpm deploy
```

After changing `wrangler.jsonc`, regenerate the binding types:

```txt
pnpm cf-typegen
```

## Project layout

```txt
src/
  index.ts               # Worker entry: scheduled handler only
  crons/
    index.ts             # Cron registry + runScheduled dispatcher
    weather.ts           # 8/10 * * * *  — OpenWeatherMap → R2
    unlock.ts            # 56 * * * *    — prune expired D1 unlocks
  openweathermap/
    request.ts           # Shared fetch helper (10s timeout + error handling)
    onecall3.ts          # Alerts (One Call 3.0)
    onecall4.ts          # Current weather (One Call 4.0)
test/                    # Vitest specs (@cloudflare/vitest-plugin)
```

## Tooling

- TypeScript (strict) with Cloudflare Workers types
- Vitest via `@cloudflare/vitest-plugin`
- ESLint (flat config) + Prettier, applied by Husky + lint-staged on commit
- Dependabot for weekly dependency updates
