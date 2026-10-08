import { query, queryOne } from '../db';
import type { BikePermission } from '../types';

interface PermissionRow {
  permission_id: string;
  bike_id: string;
  authorised_user_id: string | null;
  authorised_student_number: string;
  authorised_name: string | null;
  status: 'active' | 'revoked';
  granted_at: string;
  revoked_at: string | null;
}

function toPermission(row: PermissionRow): BikePermission {
  return {
    permissionId: row.permission_id,
    bikeId: row.bike_id,
    authorisedUserId: row.authorised_user_id,
    authorisedStudentNumber: row.authorised_student_number,
    authorisedName: row.authorised_name,
    status: row.status,
    grantedAt: new Date(row.granted_at).toISOString(),
    revokedAt: row.revoked_at ? new Date(row.revoked_at).toISOString() : null,
  };
}

const COLUMNS =
  'permission_id, bike_id, authorised_user_id, authorised_student_number, authorised_name, status, granted_at, revoked_at';

export const permissionsRepo = {
  async findById(permissionId: string): Promise<BikePermission | null> {
    const row = await queryOne<PermissionRow>(
      `SELECT ${COLUMNS} FROM bike_permissions WHERE permission_id = $1`,
      [permissionId],
    );
    return row ? toPermission(row) : null;
  },

  async listForBike(bikeId: string): Promise<BikePermission[]> {
    const rows = await query<PermissionRow>(
      `SELECT ${COLUMNS} FROM bike_permissions WHERE bike_id = $1 ORDER BY granted_at DESC`,
      [bikeId],
    );
    return rows.map(toPermission);
  },

  /** Looks a guest up by the student number read from their card. No account is needed. */
  async findActive(bikeId: string, studentNumber: string): Promise<BikePermission | null> {
    const row = await queryOne<PermissionRow>(
      `SELECT ${COLUMNS} FROM bike_permissions
       WHERE bike_id = $1 AND authorised_student_number = $2 AND status = 'active'`,
      [bikeId, studentNumber],
    );
    return row ? toPermission(row) : null;
  },

  async create(input: {
    bikeId: string;
    grantedBy: string;
    studentNumber?: string;
    authorisedUserId?: string | null;
    name?: string | null;
  }): Promise<BikePermission> {
    const row = await queryOne<PermissionRow>(
      `INSERT INTO bike_permissions (bike_id, authorised_user_id, authorised_student_number, authorised_name, granted_by)
       VALUES ($1, $2, COALESCE($3, (SELECT student_number FROM users WHERE user_id = $2)), $4, $5)
       RETURNING ${COLUMNS}`,
      [input.bikeId, input.authorisedUserId ?? null, input.studentNumber ?? null, input.name ?? null, input.grantedBy],
    );
    return toPermission(row!);
  },

  async revoke(permissionId: string): Promise<BikePermission | null> {
    const row = await queryOne<PermissionRow>(
      `UPDATE bike_permissions SET status = 'revoked', revoked_at = now()
       WHERE permission_id = $1 RETURNING ${COLUMNS}`,
      [permissionId],
    );
    return row ? toPermission(row) : null;
  },
};