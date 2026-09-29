import { query } from '../db';
import type { AuditAction } from '../types';

interface AuditRow {
  audit_id: string;
  actor_user_id: string | null;
  actor_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  timestamp: string;
  detail: string;
}

function toAudit(row: AuditRow): AuditAction {
  return {
    auditId: row.audit_id,
    actorUserId: row.actor_user_id,
    actorName: row.actor_name ?? 'System',
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    timestamp: new Date(row.timestamp).toISOString(),
    detail: row.detail,
  };
}

export const auditRepo = {
    async record(input: {
    actorUserId: string | null;
    action: string;
    entityType: string;
    entityId: string;
    detail: string;
  }): Promise<void> {
    await query(
      `INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, detail) VALUES ($1,$2,$3,$4,$5)`,
      [input.actorUserId, input.action, input.entityType, input.entityId, input.detail],
    );
  },

  async list(limit = 40): Promise<AuditAction[]> {
    const rows = await query<AuditRow>(
      `SELECT a.*, u.name AS actor_name
       FROM audit_log a
       LEFT JOIN users u ON u.user_id = a.actor_user_id
       ORDER BY a."timestamp" DESC LIMIT $1`,
      [limit],
    );
    return rows.map(toAudit);
  },
};
