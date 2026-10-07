# BikeGuard Backend

REST API, real-time gateway and gate verification engine for BikeGuard, the
RFID bicycle security and gate verification platform for the NWU campus.
This repository is independent of `CMPG-323-Bike-Guard/frontend` — it has no
build-time or runtime dependency on it — but its API surface is written to
match that frontend's contract exactly (`src/api/endpoints.ts`,
`src/types/index.ts`, `src/api/realtime.ts`) so it's a drop-in replacement
for the frontend's mock server.

## Stack

- **Fastify** (TypeScript) — HTTP API
- **PostgreSQL** via `pg` — no ORM; hand-written parameterised SQL in
  `src/repositories/*`, kept intentionally close to the reviewed
  `bikeguard_schema.sql` / `.drawio` model. (Swapping in Prisma or Drizzle
  later is possible without touching `migrations/001_init.sql`.)
- **Socket.io** — pushes `gate-event` messages to the guard dashboard
- **JWT** (`jsonwebtoken`) — stateless sessions, role-based access control
- **MQTT** (optional) — the production integration point for the physical
  Gate Bridge; the API runs fine with it disconnected

## Getting started

```bash
cp .env.example .env          # edit JWT_SECRET / HMAC_SECRET for anything shared
docker compose up -d postgres # or point DATABASE_URL at your own Postgres
npm install
npm run migrate
npm run seed                  # optional: sample students, guard, admin, gates, bikes
npm run dev
```

The API listens on `http://localhost:3000`. `GET /health` is a liveness
check. Sample logins after `npm run seed` (password `Password123!`):

| Role    | Student/staff number |
|---------|-----------------------|
| student | 30112233 (Thabo Mokoena) |
| student | 30112244 (Lerato Dube) |
| guard   | 90001122 (Sipho Nkosi) |
| admin   | 90003344 (Anja van der Merwe) |

## Exercising the verification engine without hardware

`POST /dev/simulate-crossing` (guard/admin only, disabled when
`NODE_ENV=production`) drives the same `processCrossing()` engine the MQTT
gate bridge uses in production:

```bash
curl -X POST localhost:3000/dev/simulate-crossing \
  -H "Authorization: Bearer <guard-or-admin-token>" -H 'Content-Type: application/json' \
  -d '{"gateId":"<gate-id>","studentNumber":"CARD-RAW-0001","tagUid":"TAG-RAW-0001"}'
```

Once real hardware exists, point `MQTT_URL` at the broker the Gate Bridge
publishes to — no application code changes needed (see `src/mqtt.ts`).

## Project layout

```
migrations/001_init.sql   Schema (see header comment for deviations from the
                           original bikeguard_schema.sql, extended for the
                           registration lifecycle, notifications and audit log)
src/
  config.ts, db.ts, security.ts, errors.ts, types.ts, uploads.ts
  auth-plugin.ts           JWT verification + RBAC guards on FastifyRequest
  realtime.ts              Socket.io gateway (`gate-event` channel)
  mqtt.ts                  Gate Bridge listener → verification engine → decision
  repositories/            One file per table; row <-> domain-type mapping only
  services/
    views.ts               Builds BikeView / CrossingView / AlarmView DTOs
    verification.ts         The match/mismatch decision engine (UC-02, UC-03)
    stats.ts                Dashboard stats + reporting bundle
  routes/                  One file per resource, matching endpoints.ts
scripts/
  migrate.ts, seed.ts
```

## Design notes / traceability

- **POPIA (Functional Spec 2.2, Technical Spec 7.3.4):** raw card and RFID
  tag UIDs are never persisted. `src/security.ts` HMAC-SHA256s them with a
  server-side pepper (`HMAC_SECRET`) for exact-match lookups, and derives a
  short, non-reversible display reference (`CRD-XXXXXX` / `BG-XXXXXX`) for
  everything the UI shows.
- **RBAC (FR-VER-08/09/10):** `src/auth-plugin.ts` adds
  `request.requireAuth()` / `request.requireRole(...roles)`; route handlers
  additionally check bike ownership via `requireOwnerOrRoles`. Guards can
  never register or edit a student's bike; students can only see their own
  data unless an admin is acting on their behalf.
- **Fail-safe on verification failure (NFR-REL-01, UC-06):** if the MQTT
  listener's call into the verification engine throws (e.g. the database is
  briefly unreachable), the gate is switched to manual mode automatically
  rather than left in an undefined state.
- **Audit trail (NFR-AUD-01):** every state-changing action — registrations,
  approvals, tag lifecycle, permissions, crossings, alarm resolutions, gate
  mode changes — is written to `audit_log` via `src/repositories/audit.repo.ts`
  and exposed to admins at `GET /audit`.
- **Schema deviations from the reviewed `bikeguard_schema.sql`:** documented
  inline in `migrations/001_init.sql` with `CHANGED:` comments — mainly the
  richer `bike_status` lifecycle, split `gate_health`/`gate_mode`, the
  frontend-facing `mismatch_reason` enum, and the added `notifications` and
  `audit_log` tables, all needed to serve the frontend's existing API
  contract.

## Open decisions inherited from the project (see project memory)

UUID vs. ULID for primary keys, and monthly range partitioning of
`gate_events` before scaling past the pilot gate, are both still open per
the wider project notes; this implementation uses UUIDv4 (`pgcrypto`) and an
unpartitioned `gate_events` table, both easy to change later without an API
change.
