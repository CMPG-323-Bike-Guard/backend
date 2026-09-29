import { query, queryOne } from '../db';
import type { Alarm, AlarmStatus } from '../types';

interface AlarmRow {
  alarm_id: string;
  event_id: string;
  status: AlarmStatus;
  raised_at: string;
  escalated_at: string | null;
  resolved_by_user_id: string | null;
  resolved_at: string | null;
  notes: string | null;
}

function toAlarm(row: AlarmRow): Alarm {
  return {
    alarmId: row.alarm_id,
    eventId: row.event_id,
    status: row.status,
    raisedAt: new Date(row.raised_at).toISOString(),
    escalatedAt: row.escalated_at ? new Date(row.escalated_at).toISOString() : null,
    resolvedByUserId: row.resolved_by_user_id,
    resolvedAt: row.resolved_at ? new Date(row.resolved_at).toISOString() : null,
    notes: row.notes,
  };
}

export const alarmsRepo = {
  async findById(alarmId: string): Promise<Alarm | null> {
    const row = await queryOne<AlarmRow>('SELECT * FROM alarms WHERE alarm_id = $1', [alarmId]);
    return row ? toAlarm(row) : null;
  },

  async findByEventId(eventId: string): Promise<Alarm | null> {
    const row = await queryOne<AlarmRow>('SELECT * FROM alarms WHERE event_id = $1', [eventId]);
    return row ? toAlarm(row) : null;
  },

  async create(eventId: string): Promise<Alarm> {
    const row = await queryOne<AlarmRow>(
      `INSERT INTO alarms (event_id) VALUES ($1) RETURNING *`,
      [eventId],
    );
    return toAlarm(row!);
  },

  async list(scope: 'live' | 'all' = 'live'): Promise<Alarm[]> {
    const rows =
      scope === 'live'
        ? await query<AlarmRow>(
            `SELECT * FROM alarms WHERE status IN ('open','escalated') ORDER BY raised_at DESC LIMIT 20`,
          )
        : await query<AlarmRow>(`SELECT * FROM alarms ORDER BY raised_at DESC LIMIT 100`);
    return rows.map(toAlarm);
  },

  async resolve(
    alarmId: string,
    outcome: Extract<AlarmStatus, 'cleared_in_person' | 'reported_stolen' | 'escalated'>,
    notes: string | null,
    guardUserId: string,
  ): Promise<Alarm | null> {
    const row =
      outcome === 'escalated'
        ? await queryOne<AlarmRow>(
            `UPDATE alarms SET status = $1, notes = $2, escalated_at = now() WHERE alarm_id = $3 RETURNING *`,
            [outcome, notes, alarmId],
          )
        : await queryOne<AlarmRow>(
            `UPDATE alarms SET status = $1, notes = $2, resolved_by_user_id = $3, resolved_at = now()
             WHERE alarm_id = $4 RETURNING *`,
            [outcome, notes, guardUserId, alarmId],
          );
    return row ? toAlarm(row) : null;
  },
};
