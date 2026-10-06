import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/bikeguard_test';

export default async function setup() {
  const url = new URL(testDatabaseUrl);
  const dbName = url.pathname.slice(1);

  const admin = new Client({ connectionString: testDatabaseUrl.replace(`/${dbName}`, '/postgres') });
  await admin.connect();
  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (exists.rowCount === 0) await admin.query(`CREATE DATABASE "${dbName}"`);
  await admin.end();

  const client = new Client({ connectionString: testDatabaseUrl });
  await client.connect();
  await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  const dir = path.join(process.cwd(), 'migrations');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    await client.query(readFileSync(path.join(dir, file), 'utf8'));
  }
  await client.end();
}