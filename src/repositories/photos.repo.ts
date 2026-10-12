import { query, queryOne } from '../db';
import { toPhoto, type PhotoColumns } from '../photos';
import type { PendingPhoto, PhotoModeration, PhotoTargetType } from '../types';

const TARGETS = {
  user: { table: 'users', idColumn: 'user_id' },
  bike: { table: 'bikes', idColumn: 'bike_id' },
} as const;

const PHOTO_COLUMNS = `photo_path, photo_pending, photo_status, photo_rejection_reason,
  photo_reviewed_by, photo_reviewed_at, photo_submitted_at`;

interface PendingRow extends PhotoColumns {
  target_type: PhotoTargetType;
  entity_id: string;
  owner_user_id: string;
  owner_name: string;
}

export const photosRepo = {
  async submit(targetType: PhotoTargetType, id: string, pendingUrl: string): Promise<PhotoModeration | null> {
    const { table, idColumn } = TARGETS[targetType];
    const row = await queryOne<PhotoColumns>(
      `UPDATE ${table}
          SET photo_pending = $2, photo_status = 'pending', photo_rejection_reason = NULL,
              photo_reviewed_by = NULL, photo_reviewed_at = NULL, photo_submitted_at = now()
        WHERE ${idColumn} = $1
        RETURNING ${PHOTO_COLUMNS}`,
      [id, pendingUrl],
    );
    return row ? toPhoto(row) : null;
  },

  async approve(targetType: PhotoTargetType, id: string, adminUserId: string): Promise<PhotoModeration | null> {
    const { table, idColumn } = TARGETS[targetType];
    const row = await queryOne<PhotoColumns>(
      `UPDATE ${table}
          SET photo_path = photo_pending, photo_pending = NULL, photo_status = 'approved',
              photo_rejection_reason = NULL, photo_reviewed_by = $2, photo_reviewed_at = now()
        WHERE ${idColumn} = $1 AND photo_status = 'pending' AND photo_pending IS NOT NULL
        RETURNING ${PHOTO_COLUMNS}`,
      [id, adminUserId],
    );
    return row ? toPhoto(row) : null;
  },

  async reject(targetType: PhotoTargetType, id: string, adminUserId: string, reason: string): Promise<PhotoModeration | null> {
    const { table, idColumn } = TARGETS[targetType];
    const row = await queryOne<PhotoColumns>(
      `UPDATE ${table}
          SET photo_status = 'rejected', photo_rejection_reason = $3,
              photo_reviewed_by = $2, photo_reviewed_at = now()
        WHERE ${idColumn} = $1 AND photo_status = 'pending' AND photo_pending IS NOT NULL
        RETURNING ${PHOTO_COLUMNS}`,
      [id, adminUserId, reason],
    );
    return row ? toPhoto(row) : null;
  },

  async ownerAndLabel(targetType: PhotoTargetType, id: string): Promise<{ ownerUserId: string; label: string } | null> {
    if (targetType === 'user') {
      const row = await queryOne<{ user_id: string }>('SELECT user_id FROM users WHERE user_id = $1', [id]);
      return row ? { ownerUserId: row.user_id, label: 'Your profile picture' } : null;
    }
    const row = await queryOne<{ owner_user_id: string; name: string }>(
      'SELECT owner_user_id, name FROM bikes WHERE bike_id = $1',
      [id],
    );
    return row ? { ownerUserId: row.owner_user_id, label: `The photo for ${row.name}` } : null;
  },

  async listPending(): Promise<PendingPhoto[]> {
    const rows = await query<PendingRow>(
      `SELECT * FROM (
         SELECT 'user' AS target_type, u.user_id AS entity_id, u.user_id AS owner_user_id, u.name AS owner_name,
                u.photo_path, u.photo_pending, u.photo_status, u.photo_rejection_reason,
                u.photo_reviewed_by, u.photo_reviewed_at, u.photo_submitted_at
           FROM users u
          WHERE u.photo_status = 'pending' AND u.photo_pending IS NOT NULL
         UNION ALL
         SELECT 'bike', b.bike_id, b.owner_user_id, o.name,
                b.photo_path, b.photo_pending, b.photo_status, b.photo_rejection_reason,
                b.photo_reviewed_by, b.photo_reviewed_at, b.photo_submitted_at
           FROM bikes b
           JOIN users o ON o.user_id = b.owner_user_id
          WHERE b.photo_status = 'pending' AND b.photo_pending IS NOT NULL
       ) pending
       ORDER BY photo_submitted_at DESC NULLS LAST`,
    );
    return rows.map((row) => ({
      targetType: row.target_type,
      entityId: row.entity_id,
      ownerUserId: row.owner_user_id,
      ownerName: row.owner_name,
      photo: toPhoto(row),
    }));
  },
};