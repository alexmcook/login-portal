import type { Pool, PoolClient } from 'pg'

export type PostgresLike = {
  query(text: string, params?: unknown[]): Promise<{ rows: any[] }>
  withClient(fn: (client: PoolClient) => Promise<any>): Promise<any>
  transaction(fn: (client: PoolClient) => Promise<any>): Promise<any>
}

export function createRealPostgres(pool: Pool): PostgresLike {
  return {
    query: (text: string, params?: unknown[]) => pool.query(text, params),

    withClient: async (fn: (client: PoolClient) => Promise<any>) => {
      const client = await pool.connect()
      try {
        return await fn(client)
      } finally {
        client.release()
      }
    },

    transaction: async (fn: (client: PoolClient) => Promise<any>) => {
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
  }
}

// Simple in-memory mock useful for unit tests (returns empty rows)
export function createMockPostgres(): PostgresLike {
  return {
    query: async () => ({ rows: [] }),
    withClient: async (fn: (client: PoolClient) => Promise<any>) => {
      const client = { query: async () => ({ rows: [] }), release: () => {} } as unknown as PoolClient
      return fn(client)
    },
    transaction: async (fn: (client: PoolClient) => Promise<any>) => {
      const client = { query: async () => ({ rows: [] }), release: () => {} } as unknown as PoolClient
      return fn(client)
    }
  }
}
