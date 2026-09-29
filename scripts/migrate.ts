import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { pool } from '../src/db';

async function migrate() {
  const dir = path.join(process.cwd(), 'migrations');
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {

    console.log(`Applying ${file}...`);
    const sql = readFileSync(path.join(dir, file), 'utf8');
    await pool.query(sql);
  }

  console.log('Migrations complete.');
  await pool.end();
}

migrate().catch((err) => {

  console.error(err);
  process.exit(1);
});
