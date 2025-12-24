import { describe, it, expect, vi, beforeEach } from 'vitest'
import crypto from 'crypto'
import { createMockRedis } from '../src/services/redisFactory'

describe('user repository', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    // prevent module init side-effects when importing the repo module
    vi.doMock('../src/services/redis.js', () => ({ redis: {} }))
    vi.doMock('../src/services/postgres.js', () => ({ postgres: { query: async () => ({ rows: [] }) } }))
  })

  it('findById and findByEmail return success when rows present', async () => {
    const pg = { query: vi.fn() }
    pg.query.mockResolvedValueOnce({ rows: [{ id: 'u1', email: 'a@b.com', password_hash: 'h' }] })
    const redis: any = {}
    const { createUserRepo } = await import('../src/repositories/user')
    const repo = createUserRepo(redis, pg as any)
    const byId = await repo.findById('u1')
    expect(byId.success).toBe(true)
    expect(byId.user!.id).toBe('u1')

    pg.query.mockResolvedValueOnce({ rows: [{ id: 'u1', email: 'a@b.com', password_hash: 'h', is_active: true }] })
    const byEmail = await repo.findByEmail('a@b.com')
    expect(byEmail.success).toBe(true)
    expect(byEmail.user!.email).toBe('a@b.com')
  })

  it('createUser returns success only when insert returns row', async () => {
    const pg = { query: vi.fn() }
    const redis: any = {}
    const { createUserRepo } = await import('../src/repositories/user')
    const repo = createUserRepo(redis, pg as any)

    pg.query.mockResolvedValueOnce({ rows: [] })
    const fail = await repo.createUser('a@b.com', 'h')
    expect(fail.success).toBe(false)

    pg.query.mockResolvedValueOnce({ rows: [{ id: 'u2', email: 'a@b.com', password_hash: 'h' }] })
    const ok = await repo.createUser('a@b.com', 'h')
    expect(ok.success).toBe(true)
    expect(ok.user!.id).toBe('u2')
  })

  it('setLastLogin, updatePassword and deleteUser call pg.query with correct params', async () => {
    const pg = { query: vi.fn().mockResolvedValue(undefined) }
    const redis: any = {}
    const { createUserRepo } = await import('../src/repositories/user')
    const repo = createUserRepo(redis, pg as any)

    await repo.setLastLogin('uid-1')
    expect(pg.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE users SET last_login'), ['uid-1'])

    await repo.updatePassword('uid-1', 'new-hash')
    expect(pg.query).toHaveBeenCalledWith('UPDATE users SET password_hash = $1 WHERE id = $2', ['new-hash', 'uid-1'])

    await repo.deleteUser('uid-1')
    expect(pg.query).toHaveBeenCalledWith('DELETE FROM users WHERE id = $1', ['uid-1'])
  })

  it('createActivationUrl stores hash in redis and returned token validates', async () => {
    const pg: any = { query: vi.fn() }
    const redis = createMockRedis()
    const setSpy = vi.spyOn(redis, 'set')

    // set known config via env so module reads correct values on import
    process.env.ACTIVATION_SECRET = 'act-secret'
    process.env.APP_URL = 'example.com'
    process.env.NODE_ENV = 'development'

    const { createUserRepo } = await import('../src/repositories/user')
    const repo = createUserRepo(redis, pg as any)

    const url = await repo.createActivationUrl('uid-abc')
    expect(url).toContain('token=')

    const token = url.split('token=')[1]
    // compute expected hash and compare to what was stored in redis
    const hmac = crypto.createHmac('sha256', String(process.env.ACTIVATION_SECRET))
    hmac.update(token)
    const expectedHash = hmac.digest('hex')

    expect(setSpy).toHaveBeenCalledWith(expectedHash, 'uid-abc', 24 * 60 * 60)
  })

  it('activateUser returns false when token missing and true when present', async () => {
    const pg: any = { query: vi.fn().mockResolvedValue(undefined) }
    const redis = createMockRedis()
    const getSpy = vi.spyOn(redis, 'get')
    const delSpy = vi.spyOn(redis, 'del')
    process.env.ACTIVATION_SECRET = 'act-secret'

    const { createUserRepo } = await import('../src/repositories/user')
    const repo = createUserRepo(redis, pg as any)

    const bad = await repo.activateUser('nope')
    expect(bad.success).toBe(false)

    // prepare for success: compute tokenHash for given token
    const token = 'tok-1'
    const hmac = crypto.createHmac('sha256', String(process.env.ACTIVATION_SECRET))
    hmac.update(token)
    const tokenHash = hmac.digest('hex')

    getSpy.mockResolvedValueOnce('uid-zzz')
    const ok = await repo.activateUser(token)
    expect(ok.success).toBe(true)
    expect(pg.query).toHaveBeenCalledWith('UPDATE users SET is_active = TRUE WHERE id = $1', ['uid-zzz'])
    expect(delSpy).toHaveBeenCalledWith(tokenHash)
  })

  it('createPasswordResetUrl returns false for unknown email and stores token for known email', async () => {
    const pg = { query: vi.fn() }
    const redis = createMockRedis()
    const setSpy = vi.spyOn(redis, 'set')

    process.env.PASSWORD_RESET_SECRET = 'pw-secret'
    process.env.APP_URL = 'example.com'
    process.env.NODE_ENV = 'development'

    const { createUserRepo } = await import('../src/repositories/user')
    const repo = createUserRepo(redis, pg as any)

    // unknown email
    pg.query.mockResolvedValueOnce({ rows: [] })
    const res1 = await repo.createPasswordResetUrl('no@one.com')
    expect(res1.success).toBe(false)

    // known email
    pg.query.mockResolvedValueOnce({ rows: [{ id: 'uid-77' }] })
    const res2 = await repo.createPasswordResetUrl('a@b.com')
    expect(res2.success).toBe(true)
    expect(res2.url).toContain('token=')

    const token = res2.url!.split('token=')[1]
    const hmac = crypto.createHmac('sha256', String(process.env.PASSWORD_RESET_SECRET))
    hmac.update(token)
    const expectedHash = hmac.digest('hex')
    expect(setSpy).toHaveBeenCalledWith(expectedHash, 'uid-77', 60 * 60)
  })
})
