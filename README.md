# BikeGuard — Backend

The API and gate-logic service for **BikeGuard**, NWU's RFID-based bike access control system. This repo owns the registration database, the card/tag pairing check, gate control decisions, and the audit log.

> Web client lives in a separate repo: [`frontend`](../frontend)

## What this service does

- **Registration API** — create/update/deactivate a student's card–bike–tag pairing.
- **Verification engine** — given a card read and a tag read from a gate, decides `match` (open gate) or `mismatch` (hold gate, raise alarm) in real time.
- **Gate controller interface** — talks to the physical gate hardware/edge device to trigger open/hold and receive reader events.
- **Alarm/event stream** — pushes live gate and alarm events to the Guard Dashboard over WebSocket.
- **Audit log** — records every entry, exit, and alarm with a timestamp for later investigation.
- **Fail-safe handling** — if a reader or the verification service goes offline, the lane should be flagged for manual guard checks rather than silently blocking access.

## Tech stack (proposed)

| Layer | Choice |
|---|---|
| Runtime | Node.js + TypeScript |
| Framework | Express (or Fastify) |
| Database | PostgreSQL |
| Real-time | WebSocket server (gate/alarm events to the dashboard) |
| Hardware integration | Serial/MQTT bridge to gate reader firmware |
| Auth | JWT-based sessions for staff/admin endpoints |

This is a starting-point stack, not a locked decision — adjust to match the team's skills and whatever the gate hardware vendor actually supports.

## Getting started

```bash
git clone https://github.com/CMPG-323-Bike-Guard/backend.git
cd backend
npm install
cp .env.example .env      # set DATABASE_URL, JWT_SECRET, GATE_BRIDGE_URL, etc.
npm run migrate           # set up the database schema
npm run dev
```

### Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Signing secret for staff/admin auth tokens |
| `GATE_BRIDGE_URL` | Address of the hardware bridge for reader events |
| `PORT` | Port the API server listens on |

## Project structure

```
src/
  api/
    registration/      # bike/tag/card registration endpoints
    verification/       # card+tag match logic
    audit/               # audit log query endpoints
  gate/
    controller.ts        # open/hold decisions per lane
    events.ts             # ingest reader events from hardware bridge
  realtime/
    ws-server.ts          # push live events to the dashboard
  db/
    migrations/
    models/
```

## Core data model (rough)

- `students` — student number, name, contact
- `cards` — card ID ↔ student
- `bikes` — make, colour, photo, owning student
- `tags` — RFID tag ID ↔ bike, status (active/lost/deactivated)
- `gate_events` — timestamp, lane, card ID, tag ID, result (`match`/`mismatch`), resolved-by (if a guard actioned it)

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start local dev server |
| `npm run migrate` | Run database migrations |
| `npm run test` | Run unit/integration tests |
| `npm run lint` | Lint the codebase |

## Contributing

- Branch off `main` using `feature/<short-description>` or `fix/<short-description>`.
- Open a PR against `main`; at least one review required before merge.
- The verification engine (`gate/controller.ts`) and its `match`/`mismatch` decision path need test coverage before any change is merged — this is the part that actually stops a theft.

## Status

Early-stage / pre-pilot. See the project tab for current progress

## License

TBD.
