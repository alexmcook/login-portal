import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('postgres service', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('query uses pool.query', async () => {
    const mockQuery = vi.fn().mockResolvedValue({ rows: [{ ok: true }], rowCount: 1 })

    // non-hoisted mock to avoid vitest hoisting issues
    vi.doMock('pg', () => ({
      Pool: class {
        opts: any
        constructor(opts: any) { this.opts = opts }
        async query(text: string, params?: any[]) { return mockQuery(text, params) }
        async connect() { return { query: mockQuery, release: () => {} } }
      }
    }))

    const { postgres } = await import('../src/services/postgres')

    const res = await postgres.query('SELECT 1', [])
    expect(mockQuery).toHaveBeenCalledWith('SELECT 1', [])
    expect(res).toEqual({ rows: [{ ok: true }], rowCount: 1 })
  })

  it('withClient acquires and releases client', async () => {
    const clientQuery = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 })
    const release = vi.fn()
    const connect = vi.fn().mockResolvedValue({ query: clientQuery, release })

    vi.doMock('pg', () => ({
      Pool: class {
        constructor(opts: any) {}
        query = vi.fn()
        async connect() { return connect() }
      }
    }))

    const { postgres } = await import('../src/services/postgres')

    const cb = vi.fn(async (client: any) => client.query('SELECT 2'))
    await postgres.withClient(cb)

    expect(connect).toHaveBeenCalled()
    expect(cb).toHaveBeenCalled()
    expect(release).toHaveBeenCalled()
  })

  it('transaction commits on success and rollbacks on error', async () => {
    const clientQuery = vi.fn().mockResolvedValue(undefined)
    const release = vi.fn()
    const connect = vi.fn().mockResolvedValue({ query: clientQuery, release })

    vi.doMock('pg', () => ({
      Pool: class {
        constructor(opts: any) {}
        async connect() { return connect() }
      }
    }))

    const { postgres } = await import('../src/services/postgres')

    // success path: make the clientQuery return a result for the inner function
    clientQuery.mockResolvedValueOnce(undefined) // for BEGIN
    clientQuery.mockResolvedValueOnce({ rows: [1], rowCount: 1 }) // for fn
    clientQuery.mockResolvedValueOnce(undefined) // for COMMIT

    const okFn = vi.fn(async (c: any) => {
      return { rows: [1], rowCount: 1 }
    })

    const res = await postgres.transaction(okFn)
    expect(clientQuery).toHaveBeenCalledWith('BEGIN')
    expect(clientQuery).toHaveBeenCalledWith('COMMIT')

    // error path
    clientQuery.mockClear()
    release.mockClear()
    // ensure BEGIN and ROLLBACK calls return promises
    clientQuery.mockResolvedValue(undefined)
    const badFn = vi.fn(async () => { throw new Error('boom') })
    await expect(postgres.transaction(badFn)).rejects.toThrow('boom')
    expect(clientQuery).toHaveBeenCalledWith('BEGIN')
    expect(clientQuery).toHaveBeenCalledWith('ROLLBACK')
  })
})
