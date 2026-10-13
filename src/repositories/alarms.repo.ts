import { query, queryOne } from '../db';
import type { Alarm, AlarmResolution, AlarmStatus, EscalationReason } from '../types';

interface AlarmRow {
  alarm_id: string;
  event_id: string;
  status: AlarmStatus;
  raised_at: string;
  acknowledge_by: string;
  acknowledged_at: string | null;
  acknowledged_by_user_id: string | null;
  escalated_at: string | null;
  escalation_reason: EscalationReason | null;
  resolved_by_user_id: string | null;
  resolved_at: string | null;
  notes: string | null;
}

const iso = (value: string | null): string | null => (value ? new Date(value).toISOString() : null);

function toAlarm(row: AlarmRow): Alarm {
  return {
    alarmId: row.alarm_id,
    eventId: row.event_id,
    status: row.status,
    raisedAt: new Date(row.raised_at).toISOString(),
    acknowledgeBy: new Date(row.acknowledge_by).toISOString(),
    acknowledgedAt: iso(row.acknowledged_at),
    acknowledgedByUserId: row.acknowledged_by_user_id,
    escalatedAt: iso(row.escalated_at),
    escalationReason: row.escalation_reason,
    resolvedByUserId: row.resolved_by_user_id,
    resolvedAt: iso(row.resolved_at),
    notes: row.notes,
  };
}

const LIVE = `('pending','acknowledged','escalated')`;

export const alarmsRepo = {
  async findById(alarmId: string): Promise<Alarm | null> {
    const row = await queryOne<AlarmRow>('SELECT * FROM alarms WHERE alarm_id = $1', [alarmId]);
    return row ? toAlarm(row) : null;
  },

  async findByEventId(eventId: string): Promise<Alarm | null> {
    const row = await queryOne<AlarmRow>('SELECT * FROM alarms WHERE event_id = $1', [eventId]);
    return row ? toAlarm(row) : null;
  },

  async create(eventId: string, acknowledgeBy: Date): Promise<Alarm> {
    const row = await queryOne<AlarmRow>(
      `INSERT INTO alarms (event_id, status, acknowledge_by) VALUES ($1, 'pending', $2) RETURNING *`,
      [eventId, acknowledgeBy],
    );
    return toAlarm(row!);
  },

  async list(scope: 'live' | 'all' = 'live'): Promise<Alarm[]> {
    const rows =
      scope === 'live'
        ? await query<AlarmRow>(`SELECT * FROM alarms WHERE status IN ${LIVE} ORDER BY raised_at DESC LIMIT 20`)
        : await query<AlarmRow>(`SELECT * FROM alarms ORDER BY raised_at DESC LIMIT 100`);
    return rows.map(toAlarm);
  },

  async acknowledge(alarmId: string, guardUserId: string): Promise<Alarm | null> {
    const row = await queryOne<AlarmRow>(
      `UPDATE alarms
          SET acknowledged_at = now(),
              acknowledged_by_user_id = $2,
              status = CASE WHEN status = 'pending' THEN 'acknowledged'::alarm_status ELSE status END
        WHERE alarm_id = $1 AND acknowledged_at IS NULL AND status IN ${LIVE}
        RETURNING *`,
      [alarmId, guardUserId],
    );
    return row ? toAlarm(row) : null;
  },

  async escalate(
    alarmId: string,
    reason: EscalationReason,
    actorUserId: string | null,
    notes: string | null,
  ): Promise<Alarm | null> {
    const guardAsked = reason === 'guard_request';
    const row = await queryOne<AlarmRow>(
      `UPDATE alarms
          SET status = 'escalated',
              escalated_at = now(),
              escalation_reason = $2,
              notes = COALESCE($3, notes),
              acknowledged_at = CASE WHEN $4::boolean AND acknowledged_at IS NULL THEN now() ELSE acknowledged_at END,
              acknowledged_by_user_id = CASE WHEN $4::boolean AND acknowledged_by_user_id IS NULL THEN $5::uuid ELSE acknowledged_by_user_id END
        WHERE alarm_id = $1 AND status IN ('pending','acknowledged')
        RETURNING *`,
      [alarmId, reason, notes, guardAsked, actorUserId],
    );
    return row ? toAlarm(row) : null;
  },

  async escalateOverdue(): Promise<Alarm[]> {
    const rows = await query<AlarmRow>(
      `UPDATE alarms
          SET status = 'escalated', escalated_at = now(), escalation_reason = 'no_acknowledgement'
        WHERE status = 'pending' AND acknowledge_by <= now()
        RETURNING *`,
    );
    return rows.map(toAlarm);
  },

  async resolve(
    alarmId: string,
    outcome: AlarmResolution,
    notes: string | null,
    guardUserId: string,
  ): Promise<Alarm | null> {
    const row = await queryOne<AlarmRow>(
      `UPDATE alarms
          SET status = $1,
              notes = COALESCE($2, notes),
              resolved_by_user_id = $3,
              resolved_at = now(),
              acknowledged_at = COALESCE(acknowledged_at, now()),
              acknowledged_by_user_id = COALESCE(acknowledged_by_user_id, $3)
        WHERE alarm_id = $4 AND status IN ${LIVE}
        RETURNING *`,
      [outcome, notes, guardUserId, alarmId],
    );
    return row ? toAlarm(row) : null;
  },
};