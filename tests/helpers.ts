import { query } from '../src/db';
import { resetGateAuthState } from '../src/gate-auth';
import { displayRef, hashPassword, hmacIdentifier } from '../src/security';
import { resetWatchdogState } from '../src/services/gate-watchdog';
import { clearRecentScans } from '../src/services/verification';

export async function resetDb(): Promise<void> {
  await query('TRUNCATE users, gates, bikes CASCADE');
  clearRecentScans();
  resetGateAuthState();
  resetWatchdogState();
}

export async function makeUser(
  studentNumber: string,
  role: 'student' | 'guard' | 'admin' = 'student',
  password = 'Password123!',
): Promise<string> {
  const rows = await query<{ user_id: string }>(
    `INSERT INTO users (student_number, name, email, role, password_hash)
     VALUES ($1, $2, $3, $4, $5) RETURNING user_id`,
    [studentNumber, `User ${studentNumber}`, `${studentNumber}@test.nwu.ac.za`, role, await hashPassword(password)],
  );
  return rows[0].user_id;
}

export async function makeGate(mode: 'automated' | 'manual' = 'automated'): Promise<string> {
  const rows = await query<{ gate_id: string }>(
    `INSERT INTO gates (name, location, health, commissioned, mode)
     VALUES ($1, 'Test location', 'good', true, $2) RETURNING gate_id`,
    [`Test gate ${Math.random().toString(36).slice(2, 7)}`, mode],
  );
  return rows[0].gate_id;
}

export async function makeBike(ownerId: string): Promise<string> {
  const rows = await query<{ bike_id: string }>(
    `INSERT INTO bikes (owner_user_id, name, make_model, colour, status, reviewed_at)
     VALUES ($1, 'Test bike', 'Model', 'Red', 'active', now()) RETURNING bike_id`,
    [ownerId],
  );
  return rows[0].bike_id;
}

export async function makeTag(
  bikeId: string,
  uid: string,
  status: 'active' | 'deactivated' | 'lost' | 'stolen' | 'awaiting_collection' = 'active',
): Promise<void> {
  const hmac = hmacIdentifier(uid);
  await query('INSERT INTO rfid_tags (bike_id, tag_hmac, tag_ref, status) VALUES ($1, $2, $3, $4)', [
    bikeId,
    hmac,
    displayRef('BG', hmac),
    status,
  ]);
}

export async function countRows(table: 'gate_events' | 'alarms' | 'audit_log'): Promise<number> {
  const rows = await query<{ n: string }>(`SELECT count(*) AS n FROM ${table}`);
  return Number(rows[0].n);
}