import { pool, query } from '../src/db';
import { hashPassword } from '../src/security';

function need(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Set ${name} before running this script.`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const number = need('ADMIN_NUMBER');
  const name = need('ADMIN_NAME');
  const email = need('ADMIN_EMAIL').toLowerCase();
  const password = need('ADMIN_PASSWORD');

  if (!/^\d{8}$/.test(number)) {
    console.error('ADMIN_NUMBER must be 8 digits.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('ADMIN_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }

  const existing = await query('SELECT 1 FROM users WHERE student_number = $1', [number]);
  if (existing.length > 0) {
    console.log('That admin already exists. Nothing to do.');
  } else {
    await query(
      `INSERT INTO users (student_number, name, email, role, password_hash)
       VALUES ($1, $2, $3, 'admin', $4)`,
      [number, name, email, await hashPassword(password)],
    );
    console.log(`Admin ${name} (${number}) created.`);
  }

  const gates = await query('SELECT 1 FROM gates LIMIT 1');
  if (gates.length === 0) {
    const gateName = process.env.GATE_NAME ?? 'Pilot Gate';
    const gateLocation = process.env.GATE_LOCATION ?? '';
    await query(
      `INSERT INTO gates (name, location, health, commissioned, mode)
       VALUES ($1, $2, 'good', true, 'automated')`,
      [gateName, gateLocation],
    );
    console.log(`Gate "${gateName}" created.`);
  } else {
    console.log('A gate already exists. Skipping gate creation.');
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});