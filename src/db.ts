import { AsyncLocalStorage } from 'node:async_hooks';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { config } from './config';

export const pool = new Pool({ connectionString: config.databaseUrl });

pool.on('error', (err) => {

  console.error('Unexpected Postgres pool error', err);
});

const transactionContext = new AsyncLocalStorage<PoolClient>();

function executor(): Pick<Pool, 'query'> {
  return transactionContext.getStore() ?? pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await executor().query<T>(text, params as never[]);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const existing = transactionContext.getStore();
  if (existing) return fn(existing);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await transactionContext.run(client, () => fn(client));
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}