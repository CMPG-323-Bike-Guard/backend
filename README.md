# BikeGuard Backend

REST API, real-time gateway and gate verification engine for BikeGuard, the
RFID bicycle security and gate verification platform for the NWU campus.

This repository is independent of the `CMPG-323-Bike-Guard/frontend` repo. It
has no build-time or runtime dependency on it, but the API is written to match
the frontend's contract (`src/api/endpoints.ts`, `src/types/index.ts`,
`src/api/realtime.ts`), so the two work together without adapters.

## Features

- Student, guard, manager and admin accounts with role-based access control
- Bike registration, admin approval, RFID tag lifecycle and permissions
- Gate verification engine: matches a student card and a bike tag at a gate and
  decides allow or mismatch (UC-02, UC-03)
- Real-time `gate-event` push to the guard dashboard over Socket.io
- Alarms with acknowledgement and automatic escalation when unacknowledged
- Gate management, health monitoring and an offline watchdog
- Student card linking, fed by the card bridge (`tools/card-bridge`)
- Profile and bike photos with admin moderation
- Notifications, reporting and an admin audit log

## Stack

- **Fastify** (TypeScript): HTTP API
- **PostgreSQL** via `pg`: no ORM; hand-written parameterised SQL in
  `src/repositories/*`, kept close to the reviewed `bikeguard_schema.sql`
  model
- **Socket.io**: pushes `gate-event` messages to the guard dashboard
- **JWT** (`jsonwebtoken`): stateless sessions, role-based access control
- **MQTT** (optional): integration point for the physical Gate Bridge; the API
  runs fine with it disconnected
- **Vitest**: automated tests

## Getting started

Requires Node.js 20 or later and a PostgreSQL database.

```bash
cp .env.example .env          # set JWT_SECRET, HMAC_SECRET, GATE_MASTER_SECRET for anything shared
docker compose up -d postgres # or point DATABASE_URL at your own Postgres
npm install
npm run migrate
npm run seed                  # optional: sample students, guard, admin, gates, bikes
npm run dev
```

The API listens on `http://localhost:3000` and is served under `/api/v1`.
`GET /health` is a liveness check.

Sample logins after `npm run seed` (development only, password
`Password123!`):

| Role    | Student/staff number      |
|---------|---------------------------|
| student | 30112233 (Thabo Mokoena)  |
| student | 30112244 (Lerato Dube)    |
| guard   | 90001122 (Sipho Nkosi)    |
| admin   | 90003344 (Anja van der Merwe) |

To run the API and database together in Docker instead, use
`docker compose up --build`.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Run the API with hot reload (tsx) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled server (`dist/server.js`) |
| `npm run migrate` | Apply `migrations/*.sql` in order; applied files are tracked in `schema_migrations` |
| `npm run seed` | Load sample users, gates and bikes |
| `npm run seed:reset` | Reset and reload the sample data |
| `npm run bootstrap` | Create the first admin in a real deployment. Needs `ADMIN_NUMBER` (8 digits), `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (8+ characters) |
| `npm run gate-key` | Derive a gate's signing key from `GATE_MASTER_SECRET` |
| `npm run fake-reader` | Simulate a gate reader sending signed events |
| `npm run typecheck` | Type check without emitting files |
| `npm test` | Run the test suite (needs a reachable Postgres, see `tests/global-setup.ts`) |

## Environment variables

Copy `.env.example` to `.env`. In production the server refuses to start if
`JWT_SECRET`, `HMAC_SECRET` or `GATE_MASTER_SECRET` are left at their
development defaults.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Session token signing secret and lifetime (default `12h`) |
| `HMAC_SECRET` | Server-side pepper used to hash card and tag UIDs |
| `GATE_MASTER_SECRET` | Master secret for per-gate request signing |
| `GATE_SIGNING_REQUIRED` | Require signed gate requests (defaults to on in production) |
| `API_PREFIX` | API path prefix (default `/api/v1`) |
| `PUBLIC_ORIGIN` | Public URL of this API, used to build absolute photo URLs |
| `CORS_ORIGIN` | Allowed frontend origin(s), comma-separated |
| `UPLOADS_DIR`, `PUBLIC_UPLOADS_PATH` | Where uploaded photos are stored and served |
| `PHOTO_STORAGE` | `disk` (default) or `db` |
| `ENABLE_SIMULATOR` | Enables `/dev/simulate-crossing` (on by default outside production) |
| `CARD_BRIDGE_KEY` | Shared secret the card bridge sends to `POST /cards/tap` |
| `MQTT_URL`, `MQTT_USERNAME`, `MQTT_PASSWORD`, `MQTT_TOPIC_PREFIX` | Optional, for real gate hardware |
| `ALARM_ACK_TIMEOUT_MS`, `ALARM_ESCALATION_INTERVAL_MS` | Alarm escalation timing |
| `GATE_OFFLINE_AFTER_MS`, `GATE_WATCHDOG_INTERVAL_MS`, `GATE_MAX_SKEW_MS` | Gate health and signature clock-skew limits |
| `VERIFICATION_TIMEOUT_MS`, `SCAN_DEBOUNCE_MS` | Verification timing |
| `LOGIN_RATE_LIMIT_MAX`, `LOGIN_RATE_LIMIT_WINDOW` | Login rate limiting (default 5 per minute) |
| `TRUST_PROXY` | Set to `true` when running behind a reverse proxy |

## Exercising the verification engine without hardware

`POST /api/v1/dev/simulate-crossing` (guard or admin only) drives the same
`processCrossing()` engine the MQTT gate bridge uses in production. It is
available when `ENABLE_SIMULATOR=true`, or outside production when the variable
is unset.

```bash
curl -X POST localhost:3000/api/v1/dev/simulate-crossing \
  -H "Authorization: Bearer <guard-or-admin-token>" -H 'Content-Type: application/json' \
  -d '{"gateId":"<gate-uuid>","studentNumber":"CARD-RAW-0001","tagUid":"TAG-RAW-0001"}'
```

The frontend's guard dashboard also has a reader emulator that calls this
endpoint. Once real hardware exists, point `MQTT_URL` at the broker the Gate
Bridge publishes to; no application code changes are needed (see
`src/mqtt.ts`).

## Card reader bridge

`tools/card-bridge/` is a small Python program that runs on the laptop with the
ACR122U card reader attached. It reads a tapped card's UID and sends it to
`POST /api/v1/cards/tap`, authenticated with `CARD_BRIDGE_KEY`. Admins then link
cards to students in the app, and the gate check uses that link. Setup steps are
in `tools/card-bridge/README.md`.

## Project layout

```
migrations/               Numbered SQL migrations, applied in order by
                          `npm run migrate` (001 is the base schema; see its
                          header comment for deviations from the original
                          bikeguard_schema.sql). 003 was intentionally skipped.
src/
  server.ts, app.ts        Entry point and Fastify app assembly
  config.ts, db.ts, security.ts, errors.ts, types.ts, uploads.ts, photos.ts
  auth-plugin.ts           JWT verification + RBAC guards on FastifyRequest
  gate-auth.ts             Signed gate request verification
  realtime.ts              Socket.io gateway (`gate-event` channel)
  mqtt.ts                  Gate Bridge listener -> verification engine -> decision
  repositories/            One file per table; row <-> domain-type mapping only
  services/
    verification.ts        The match/mismatch decision engine (UC-02, UC-03)
    alarm-escalation.ts    Escalates alarms nobody has acknowledged
    gate-watchdog.ts       Marks gates offline when they stop reporting
    card-taps.ts           Handles card taps from the card bridge
    views.ts               Builds BikeView / CrossingView / AlarmView DTOs
    stats.ts               Dashboard stats + reporting bundle
  routes/                  One file per resource, matching the frontend's endpoints.ts
scripts/                   migrate, seed, bootstrap, gate-key, fake-reader
tests/                     Vitest suites (API, verification, gate auth, watchdog)
tools/card-bridge/         Python bridge for the USB card reader
```

## Deployment

<!-- Fill this in: where the API is hosted, the live URL, which environment
     variables you set (at minimum DATABASE_URL, JWT_SECRET, HMAC_SECRET,
     GATE_MASTER_SECRET, CORS_ORIGIN, PUBLIC_ORIGIN, CARD_BRIDGE_KEY), and that
     the first deploy runs `npm run migrate` followed by `npm run bootstrap`. -->

A `Dockerfile` is included. It builds the TypeScript and starts
`node dist/server.js` with `NODE_ENV=production`.

## Design notes / traceability

- **POPIA (Functional Spec 2.2, Technical Spec 7.3.4):** raw card and RFID tag
  UIDs are never persisted. `src/security.ts` HMAC-SHA256s them with a
  server-side pepper (`HMAC_SECRET`) for exact-match lookups, and derives a
  short, non-reversible display reference (`CRD-XXXXXX` / `BG-XXXXXX`) for
  everything the UI shows.
- **RBAC (FR-VER-08/09/10):** `src/auth-plugin.ts` adds `request.requireAuth()`
  and `request.requireRole(...roles)`; route handlers additionally check bike
  ownership via `requireOwnerOrRoles`. Guards can never register or edit a
  student's bike; students can only see their own data unless an admin is
  acting on their behalf.
- **Fail-safe on verification failure (NFR-REL-01, UC-06):** if the MQTT
  listener's call into the verification engine throws (for example the database
  is briefly unreachable), the gate is switched to manual mode automatically
  rather than left in an undefined state.
- **Audit trail (NFR-AUD-01):** every state-changing action (registrations,
  approvals, tag lifecycle, permissions, crossings, alarm resolutions, gate mode
  changes) is written to `audit_log` via `src/repositories/audit.repo.ts` and
  exposed to admins at `GET /audit`.
- **Schema deviations from `bikeguard_schema.sql`:** documented inline in
  `migrations/001_init.sql` with `CHANGED:` comments. The main ones are the
  richer `bike_status` lifecycle, split `gate_health` / `gate_mode`, the
  frontend-facing `mismatch_reason` enum, and the added `notifications` and
  `audit_log` tables, all needed to serve the frontend's API contract. Later
  migrations add photo moderation, alarm acknowledgement and card linking.

## Design decisions

- **UUIDv4 primary keys** (`pgcrypto`) rather than ULIDs. Either can be adopted
  later without an API change.
- **`gate_events` is not partitioned.** Monthly range partitioning is worth
  doing before scaling past the pilot gate, and can be added without an API
  change.
- **No ORM.** Plain parameterised SQL keeps the code close to the schema; Prisma
  or Drizzle could be introduced later without touching `001_init.sql`.