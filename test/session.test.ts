import { describe, it, expect, vi, beforeEach } from 'vitest'

// mock redis methods used by the session service
const mockRedis = {
  set: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
  expire: vi.fn(),
  exists: vi.fn(),
}

// lightweight fake FastifyReply for cookie interaction
function makeReply() {
  return {
    cookies: {} as Record<string, any>,
    setCookie: vi.fn(function (name: string, value: string, opts: any) {
      this.cookies[name] = { value, opts }
    }),
    clearCookie: vi.fn(function (name: string) {
      delete this.cookies[name]
    }),
  } as any
}

describe('session service', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    mockRedis.set.mockReset()
    mockRedis.get.mockReset()
    mockRedis.del.mockReset()
    mockRedis.expire.mockReset()
  })

  it('creates a session: returns jwt token and sets cookie and refresh token in redis', async () => {
    process.env.JWT_SECRET = 'test-secret'
    process.env.JWT_TTL_SECONDS = '3600'
    process.env.REFRESH_TTL_SECONDS = '7200'
    // replace the redis import before loading the module
    vi.doMock('../src/services/redis.js', () => ({ redis: mockRedis }))

    const { session } = await import('../src/services/session')

    const reply = makeReply()

    const sid = await session.create(reply, 'uid-1')

    expect(typeof sid).toBe('string')
    expect(mockRedis.set).toHaveBeenCalled()
    expect(reply.setCookie).toHaveBeenCalledWith('sid', sid, expect.objectContaining({ httpOnly: true }))
    expect(reply.setCookie).toHaveBeenCalledWith('refresh', expect.any(String), expect.objectContaining({ httpOnly: true }))
  })

  it('gets a session: returns null for missing token and uid when not blacklisted', async () => {
    process.env.JWT_SECRET = 'test-secret'
    process.env.JWT_TTL_SECONDS = '3600'
    vi.doMock('../src/services/redis.js', () => ({ redis: mockRedis }))
    const { session } = await import('../src/services/session')

    mockRedis.exists.mockResolvedValue(false)
    let res = await session.get(undefined)
    expect(res).toBeNull()

    // invalid token
    res = await session.get('nope')
    expect(res).toBeNull()

    // valid token
    const jwt = (await import('jsonwebtoken')) as any
    const token = jwt.sign({ uid: 'uid-xyz', jti: 'jti-1' }, 'test-secret', { expiresIn: 3600 })
    mockRedis.exists.mockResolvedValueOnce(false)
    res = await session.get(token)
    expect(res).toBe('uid-xyz')
  })

  it('destroys a session: blacklists jti in redis, deletes refresh key and clears cookies', async () => {
    process.env.JWT_SECRET = 'test-secret'
    process.env.JWT_TTL_SECONDS = '3600'
    vi.doMock('../src/services/redis.js', () => ({ redis: mockRedis }))
    const { session } = await import('../src/services/session')

    const reply = makeReply()
    const jwt = (await import('jsonwebtoken')) as any
    const token = jwt.sign({ uid: 'u', jti: 'jti-123', exp: Math.floor(Date.now() / 1000) + 1000 }, 'test-secret')

    mockRedis.set.mockResolvedValueOnce(undefined as any)
    mockRedis.del.mockResolvedValueOnce(undefined as any)

    await session.destroy(reply, token, 'r-1')

    expect(mockRedis.set).toHaveBeenCalled()
    expect(mockRedis.del).toHaveBeenCalled()
    expect(reply.clearCookie).toHaveBeenCalledWith('sid')
    expect(reply.clearCookie).toHaveBeenCalledWith('refresh')
  })

  it('refreshes access token using refresh token and rotates refresh token', async () => {
    process.env.JWT_SECRET = 'test-secret'
    process.env.JWT_TTL_SECONDS = '3600'
    process.env.REFRESH_TTL_SECONDS = '7200'
    vi.doMock('../src/services/redis.js', () => ({ redis: mockRedis }))
    const { session } = await import('../src/services/session')

    const reply = makeReply()
    mockRedis.get.mockResolvedValueOnce('uid-abc')
    mockRedis.set.mockResolvedValueOnce(undefined as any)
    mockRedis.del.mockResolvedValueOnce(undefined as any)

    const newAccess = await session.refresh(reply, 'r-1')
    expect(newAccess).toBeTruthy()
    expect(mockRedis.get).toHaveBeenCalled()
    expect(mockRedis.set).toHaveBeenCalled()
    expect(mockRedis.del).toHaveBeenCalled()
    expect(reply.setCookie).toHaveBeenCalledWith('sid', expect.any(String), expect.objectContaining({ httpOnly: true }))
    expect(reply.setCookie).toHaveBeenCalledWith('refresh', expect.any(String), expect.objectContaining({ httpOnly: true }))
  })

  it('refreshTtl is a no-op for JWT sessions', async () => {
    process.env.JWT_SECRET = 'test-secret'
    process.env.JWT_TTL_SECONDS = '3600'
    vi.doMock('../src/services/redis.js', () => ({ redis: mockRedis }))
    const { session } = await import('../src/services/session')

    mockRedis.expire.mockResolvedValueOnce(undefined as any)
    await session.refreshTtl('sid-789')
    expect(mockRedis.expire).not.toHaveBeenCalled()
  })
})
