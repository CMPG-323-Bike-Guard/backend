import { query, queryOne } from '../db';
import type { Bike, BikeStatus } from '../types';

interface BikeRow {
  bike_id: string;
  owner_user_id: string;
  name: string;
  make_model: string;
  colour: string;
  photo_path: string | null;
  status: BikeStatus;
  submitted_at: string;
  reviewed_at: string | null;
  review_note: string | null;
}

function toBike(row: BikeRow): Bike {
  return {
    bikeId: row.bike_id,
    ownerUserId: row.owner_user_id,
    name: row.name,
    makeModel: row.make_model,
    colour: row.colour,
    photoPath: row.photo_path,
    status: row.status,
    submittedAt: new Date(row.submitted_at).toISOString(),
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : null,
    reviewNote: row.review_note,
  };
}

export const bikesRepo = {
  async findById(bikeId: string): Promise<Bike | null> {
    const row = await queryOne<BikeRow>('SELECT * FROM bikes WHERE bike_id = $1', [bikeId]);
    return row ? toBike(row) : null;
  },

  async listForOwner(ownerUserId: string): Promise<Bike[]> {
    const rows = await query<BikeRow>(
      'SELECT * FROM bikes WHERE owner_user_id = $1 ORDER BY submitted_at DESC',
      [ownerUserId],
    );
    return rows.map(toBike);
  },

  async listByStatus(status?: BikeStatus): Promise<Bike[]> {
    const rows = status
      ? await query<BikeRow>('SELECT * FROM bikes WHERE status = $1 ORDER BY submitted_at DESC', [status])
      : await query<BikeRow>('SELECT * FROM bikes ORDER BY submitted_at DESC');
    return rows.map(toBike);
  },

  async listActive(): Promise<Bike[]> {
    const rows = await query<BikeRow>("SELECT * FROM bikes WHERE status = 'active'");
    return rows.map(toBike);
  },

  async create(input: {
    ownerUserId: string;
    name: string;
    makeModel: string;
    colour: string;
    photoPath: string | null;
    status: BikeStatus;
  }): Promise<Bike> {
    const row = await queryOne<BikeRow>(
      `INSERT INTO bikes (owner_user_id, name, make_model, colour, photo_path, status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [input.ownerUserId, input.name, input.makeModel, input.colour, input.photoPath, input.status],
    );
    return toBike(row!);
  },

  async update(
    bikeId: string,
    fields: Partial<{ name: string; makeModel: string; colour: string; photoPath: string }>,
  ): Promise<Bike | null> {
    const sets: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    if (fields.name !== undefined) {
      sets.push(`name = $${i++}`);
      params.push(fields.name);
    }
    if (fields.makeModel !== undefined) {
      sets.push(`make_model = $${i++}`);
      params.push(fields.makeModel);
    }
    if (fields.colour !== undefined) {
      sets.push(`colour = $${i++}`);
      params.push(fields.colour);
    }
    if (fields.photoPath !== undefined) {
      sets.push(`photo_path = $${i++}`);
      params.push(fields.photoPath);
    }
    if (sets.length === 0) return this.findById(bikeId);
    params.push(bikeId);
    const row = await queryOne<BikeRow>(
      `UPDATE bikes SET ${sets.join(', ')} WHERE bike_id = $${i} RETURNING *`,
      params,
    );
    return row ? toBike(row) : null;
  },

  async setStatus(
    bikeId: string,
    status: BikeStatus,
    extra: { reviewedAt?: Date | null; reviewNote?: string | null; submittedAt?: Date } = {},
  ): Promise<Bike | null> {
    const sets = ['status = $1'];
    const params: unknown[] = [status];
    let i = 2;
    if ('reviewedAt' in extra) {
      sets.push(`reviewed_at = $${i++}`);
      params.push(extra.reviewedAt ?? null);
    }
    if ('reviewNote' in extra) {
      sets.push(`review_note = $${i++}`);
      params.push(extra.reviewNote ?? null);
    }
    if (extra.submittedAt) {
      sets.push(`submitted_at = $${i++}`);
      params.push(extra.submittedAt);
    }
    params.push(bikeId);
    const row = await queryOne<BikeRow>(
      `UPDATE bikes SET ${sets.join(', ')} WHERE bike_id = $${i} RETURNING *`,
      params,
    );
    return row ? toBike(row) : null;
  },
};
