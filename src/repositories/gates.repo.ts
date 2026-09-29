import { query, queryOne } from '../db';
import type { Gate, GateHealth, GateMode } from '../types';

interface GateRow {
  gate_id: string;
  name: string;
  location: string;
  health: GateHealth;
  commissioned: boolean;
  mode: GateMode;
  manual_since: string | null;
}

function toGate(row: GateRow): Gate {
  return {
    gateId: row.gate_id,
    name: row.name,
    location: row.location,
    health: row.health,
    commissioned: row.commissioned,
    mode: row.mode,
    manualSince: row.manual_since ? new Date(row.manual_since).toISOString() : null,
  };
}

export const gatesRepo = {
  async list(): Promise<Gate[]> {
    const rows = await query<GateRow>('SELECT * FROM gates ORDER BY name');
    return rows.map(toGate);
  },

  async findById(gateId: string): Promise<Gate | null> {
    const row = await queryOne<GateRow>('SELECT * FROM gates WHERE gate_id = $1', [gateId]);
    return row ? toGate(row) : null;
  },

  async setMode(gateId: string, mode: GateMode, health: GateHealth, manualSince: Date | null): Promise<Gate | null> {
    const row = await queryOne<GateRow>(
      `UPDATE gates SET mode = $1, health = $2, manual_since = $3 WHERE gate_id = $4 RETURNING *`,
      [mode, health, manualSince, gateId],
    );
    return row ? toGate(row) : null;
  },

  async setHealth(gateId: string, health: GateHealth): Promise<Gate | null> {
    const row = await queryOne<GateRow>('UPDATE gates SET health = $1 WHERE gate_id = $2 RETURNING *', [
      health,
      gateId,
    ]);
    return row ? toGate(row) : null;
  },

  async create(input: { name: string; location: string; commissioned?: boolean }): Promise<Gate> {
    const row = await queryOne<GateRow>(
      `INSERT INTO gates (name, location, commissioned, health)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [input.name, input.location, input.commissioned ?? true, input.commissioned === false ? 'not_commissioned' : 'good'],
    );
    return toGate(row!);
  },
};
