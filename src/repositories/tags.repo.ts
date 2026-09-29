import { query, queryOne } from '../db';
import type { RfidTag, TagStatus } from '../types';

interface TagRow {
  tag_id: string;
  bike_id: string;
  tag_ref: string;
  status: TagStatus;
  issued_at: string | null;
  deactivated_at: string | null;
  replaces_tag_id: string | null;
}

function toTag(row: TagRow): RfidTag {
  return {
    tagId: row.tag_id,
    bikeId: row.bike_id,
    tagRef: row.tag_ref,
    status: row.status,
    issuedAt: row.issued_at ? new Date(row.issued_at).toISOString() : null,
    deactivatedAt: row.deactivated_at ? new Date(row.deactivated_at).toISOString() : null,
    replacesTagId: row.replaces_tag_id,
  };
}

const COLUMNS = 'tag_id, bike_id, tag_ref, status, issued_at, deactivated_at, replaces_tag_id';

export const tagsRepo = {
  async findById(tagId: string): Promise<RfidTag | null> {
    const row = await queryOne<TagRow>(`SELECT ${COLUMNS} FROM rfid_tags WHERE tag_id = $1`, [tagId]);
    return row ? toTag(row) : null;
  },

    async findForBike(bikeId: string): Promise<RfidTag | null> {
    const row = await queryOne<TagRow>(
      `SELECT ${COLUMNS} FROM rfid_tags WHERE bike_id = $1
       ORDER BY (status <> 'deactivated') DESC, issued_at DESC LIMIT 1`,
      [bikeId],
    );
    return row ? toTag(row) : null;
  },

  async findByHmac(tagHmac: string): Promise<RfidTag | null> {
    const row = await queryOne<TagRow>(`SELECT ${COLUMNS} FROM rfid_tags WHERE tag_hmac = $1`, [tagHmac]);
    return row ? toTag(row) : null;
  },

    async findLiveByHmac(tagHmac: string): Promise<RfidTag | null> {
    const row = await queryOne<TagRow>(
      `SELECT ${COLUMNS} FROM rfid_tags WHERE tag_hmac = $1 AND status <> 'deactivated'`,
      [tagHmac],
    );
    return row ? toTag(row) : null;
  },

  async create(input: {
    bikeId: string;
    tagHmac: string;
    tagRef: string;
    status: TagStatus;
    replacesTagId?: string | null;
  }): Promise<RfidTag> {
    const row = await queryOne<TagRow>(
      `INSERT INTO rfid_tags (bike_id, tag_hmac, tag_ref, status, replaces_tag_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING ${COLUMNS}`,
      [input.bikeId, input.tagHmac, input.tagRef, input.status, input.replacesTagId ?? null],
    );
    return toTag(row!);
  },

  async setStatus(tagId: string, status: TagStatus, deactivatedAt?: Date | null): Promise<RfidTag | null> {
    const row = await queryOne<TagRow>(
      `UPDATE rfid_tags SET status = $1, deactivated_at = $2 WHERE tag_id = $3 RETURNING ${COLUMNS}`,
      [status, deactivatedAt ?? null, tagId],
    );
    return row ? toTag(row) : null;
  },

  async listByBikeIds(bikeIds: string[]): Promise<RfidTag[]> {
    if (bikeIds.length === 0) return [];
    const rows = await query<TagRow>(`SELECT ${COLUMNS} FROM rfid_tags WHERE bike_id = ANY($1::uuid[])`, [bikeIds]);
    return rows.map(toTag);
  },
};
