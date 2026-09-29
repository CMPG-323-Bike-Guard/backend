import { query, queryOne } from '../db';
import type { CrossingResult, CrossingSource, GateEvent, MismatchReason } from '../types';

interface EventRow {
  event_id: string;
  timestamp: string;
  gate_id: string;
  user_id: string | null;
  bike_id: string | null;
  card_ref: string | null;
  tag_ref: string | null;
  result: CrossingResult;
  mismatch_reason: MismatchReason | null;
  source: CrossingSource;
  guard_user_id: string | null;
  verification_ms: number | null;
  offline: boolean;
  note: string | null;
}

function toEvent(row: EventRow): GateEvent {
  return {
    eventId: row.event_id,
    timestamp: new Date(row.timestamp).toISOString(),
    gateId: row.gate_id,
    userId: row.user_id,
    bikeId: row.bike_id,
    cardRef: row.card_ref,
    tagRef: row.tag_ref,
    result: row.result,
    mismatchReason: row.mismatch_reason,
    source: row.source,
    guardUserId: row.guard_user_id,
    verificationMs: row.verification_ms,
    offline: row.offline,
    note: row.note,
  };
}

export interface CrossingFilters {
  gateId?: string;
  result?: CrossingResult;
  query?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export const eventsRepo = {
  async findById(eventId: string): Promise<GateEvent | null> {
    const row = await queryOne<EventRow>('SELECT * FROM gate_events WHERE event_id = $1', [eventId]);
    return row ? toEvent(row) : null;
  },

  async create(input: {
    gateId: string;
    userId: string | null;
    bikeId: string | null;
    cardRef: string | null;
    tagRef: string | null;
    result: CrossingResult;
    mismatchReason: MismatchReason | null;
    source: CrossingSource;
    guardUserId: string | null;
    verificationMs: number | null;
    offline: boolean;
    note: string | null;
  }): Promise<GateEvent> {
    const row = await queryOne<EventRow>(
      `INSERT INTO gate_events
         (gate_id, user_id, bike_id, card_ref, tag_ref, result, mismatch_reason, source, guard_user_id,
          verification_ms, offline, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        input.gateId,
        input.userId,
        input.bikeId,
        input.cardRef,
        input.tagRef,
        input.result,
        input.mismatchReason,
        input.source,
        input.guardUserId,
        input.verificationMs,
        input.offline,
        input.note,
      ],
    );
    return toEvent(row!);
  },

  async list(filters: CrossingFilters = {}): Promise<GateEvent[]> {
    const clauses: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (filters.gateId) {
      clauses.push(`gate_id = $${i++}`);
      params.push(filters.gateId);
    }
    if (filters.result) {
      clauses.push(`result = $${i++}`);
      params.push(filters.result);
    }
    if (filters.from) {
      clauses.push(`"timestamp" >= $${i++}`);
      params.push(new Date(filters.from));
    }
    if (filters.to) {
      clauses.push(`"timestamp" <= $${i++}`);
      params.push(new Date(new Date(filters.to).getTime() + 86_399_000));
    }
    if (filters.query) {

      clauses.push(`(card_ref ILIKE $${i} OR tag_ref ILIKE $${i})`);
      params.push(`%${filters.query}%`);
      i += 1;
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    params.push(filters.limit ?? 200);
    const rows = await query<EventRow>(
      `SELECT * FROM gate_events ${where} ORDER BY "timestamp" DESC LIMIT $${i}`,
      params,
    );
    return rows.map(toEvent);
  },

  async listSince(cutoff: Date): Promise<GateEvent[]> {
    const rows = await query<EventRow>('SELECT * FROM gate_events WHERE "timestamp" >= $1 ORDER BY "timestamp"', [
      cutoff,
    ]);
    return rows.map(toEvent);
  },

  async listAll(): Promise<GateEvent[]> {
    const rows = await query<EventRow>('SELECT * FROM gate_events ORDER BY "timestamp"');
    return rows.map(toEvent);
  },
};
