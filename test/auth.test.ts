import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { QueryResult } from 'pg'

// Create typed mock functions and set them up before importing the tested modules.
const mockedQuery = vi.fn<[string, any?], Promise<QueryResult<any>>>()
// Minimal client shape used by our helpers in tests — keep this narrow to avoid
// needing the full PoolClient surface in tests.
type TestClient = {
  query: (...args: [string, any?]) => Promise<QueryResult<any>>
  release: () => void
}
const mockedConnect = vi.fn<[], Promise<TestClient>>()

const mockedHash = vi.fn<[string, any?], Promise<string>>()
const mockedVerify = vi.fn<[string, string], Promise<boolean>>()

// Use non-hoisted mocks (doMock) so we can reference local mock vars safely,
// then dynamically import the modules under test.
vi.doMock('../src/db.js', () => ({
  pool: {
    query: mockedQuery,
    connect: mockedConnect,
  },
}))

vi.doMock('argon2', () => ({
  hash: mockedHash,
  verify: mockedVerify,
}))

// Import after mocks are set up.
const { createUser, verifyUser } = await import('../src/auth.js')
const { pool } = await import('../src/db.js')

describe('auth module', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  const emptyResult: QueryResult<any> = { command: '', rowCount: 0, oid: 0, fields: [], rows: [] }
  const oneUser: QueryResult<any> = { command: '', rowCount: 1, oid: 0, fields: [], rows: [{ id: 'u1', password_hash: 'h' }] }

  it('verifyUser returns 401 when user not found', async () => {
    mockedQuery.mockResolvedValueOnce(emptyResult)
    const res = await verifyUser('noone@example.com', 'pw')
    expect(res.ok).toBe(false)
    expect(res.code).toBe(401)
  })

  it('verifyUser returns 401 on bad password', async () => {
    mockedQuery.mockResolvedValueOnce(oneUser)
    mockedVerify.mockResolvedValueOnce(false)
    const res = await verifyUser('u@example.com', 'wrong')
    expect(res.ok).toBe(false)
    expect(res.code).toBe(401)
  })

  it('verifyUser returns ok on correct password and updates last_login', async () => {
    mockedQuery
      .mockResolvedValueOnce(oneUser) // select
      .mockResolvedValueOnce(emptyResult) // update
    mockedVerify.mockResolvedValueOnce(true)

    const res = await verifyUser('u@example.com', 'right')
    expect(res.ok).toBe(true)
    expect(res.userId).toBe('u1')
    // ensure update called
    expect(mockedQuery.mock.calls.some((c) => String(c[0]).includes('UPDATE users SET last_login'))).toBe(true)
  })

  it('createUser returns 409 if email exists', async () => {
    // pool.connect() should return a client with query function
    const clientQuery = vi.fn<[string, any?], Promise<QueryResult<any>>>()
    const client: TestClient = { query: clientQuery, release: vi.fn() }
    mockedConnect.mockResolvedValueOnce(client)
    // order: BEGIN, SELECT existing -> rowCount 1
    vi.mocked(clientQuery).mockResolvedValueOnce(emptyResult)
    vi.mocked(clientQuery).mockResolvedValueOnce(oneUser)

    const res = await createUser('exists@example.com', 'pw')
    expect(res.ok).toBe(false)
    expect(res.code).toBe(409)
    expect(client.query).toHaveBeenCalledWith('ROLLBACK')
  })

  it('createUser inserts and returns user on success', async () => {
    const clientQuery = vi.fn<[string, any?], Promise<QueryResult<any>>>()
    const client: TestClient = { query: clientQuery, release: vi.fn() }
    mockedConnect.mockResolvedValueOnce(client)
    vi.mocked(clientQuery).mockResolvedValueOnce(emptyResult)
    vi.mocked(clientQuery).mockResolvedValueOnce(emptyResult)
    vi.mocked(clientQuery).mockResolvedValueOnce({ command: '', rowCount: 1, oid: 0, fields: [], rows: [{ id: 'u2', email: 'x@x.com', created_at: new Date().toISOString() }] } as QueryResult<any>)
    vi.mocked(clientQuery).mockResolvedValueOnce(emptyResult)

    // make sure argon2.hash resolves
    mockedHash.mockResolvedValueOnce('hashed')

    const res = await createUser('new@example.com', 'pw')
    expect(res.ok).toBe(true)
    expect(res.user).toHaveProperty('id')
  })
})
