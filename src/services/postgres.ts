import { Pool, type QueryResult, type PoolClient, type QueryResultRow } from 'pg'
import { config } from '../config.js'

const pool = new Pool({
  host: config.POSTGRES_HOST,
  port: Number(config.POSTGRES_PORT),
  user: config.POSTGRES_USER,
  password: config.POSTGRES_PASSWORD,
  database: config.POSTGRES_DB,
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
