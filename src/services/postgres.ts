import { Pool, type QueryResult, type PoolClient, type QueryResultRow } from 'pg'

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  max: 10
})

// Convenience wrapper for simple queries using the shared pool
export async function query(text: string, params?: unknown[]): Promise<QueryResult<QueryResultRow>> {
  return pool.query(text, params)
}

// Acquire a client, run the callback, and always release the client
export async function withClient(fn: (client: PoolClient) => Promise<QueryResult<QueryResultRow>>): Promise<QueryResult<QueryResultRow>> {
  const client = await pool.connect()
  try {
    return await fn(client)
  } finally {
    client.release()
  }
}

// Run a function inside a DB transaction (BEGIN / COMMIT / ROLLBACK)
export async function transaction(fn: (client: PoolClient) => Promise<QueryResult<QueryResultRow>>): Promise<QueryResult<QueryResultRow>> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}
