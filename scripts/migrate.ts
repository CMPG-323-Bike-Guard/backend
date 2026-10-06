import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { pool } from '../src/db';

async function migrate() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       filename   TEXT        PRIMARY KEY,
       applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
     )`,
  );

  const dir = path.join(process.cwd(), 'migrations');
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

  const { rows } = await pool.query<{ filename: string }>('SELECT filename FROM schema_migrations');
  const applied = new Set(rows.map((row) => row.filename));

  if (applied.size === 0 && files.includes('001_init.sql')) {
    const { rows: probe } = await pool.query<{ present: string | null }>(`SELECT to_regclass('public.users') AS present`);
    if (probe[0].present) {
      console.log('Existing schema detected — recording 001_init.sql as already applied.');
      await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', ['001_init.sql']);
      applied.add('001_init.sql');
    }
  }

  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    console.log(`Applying ${file}...`);
    await pool.query(readFileSync(path.join(dir, file), 'utf8'));
    await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
    ran += 1;
  }

  console.log(ran === 0 ? 'Database is up to date.' : 'Migrations complete.');
  await pool.end();
}

migrate().catch((err) => {

  console.error(err);
  process.exit(1);
});