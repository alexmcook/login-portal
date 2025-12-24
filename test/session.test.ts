import { describe, it, expect, vi, beforeEach } from 'vitest'

// mock redis methods used by the session service
const mockRedis = {
  set: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
  expire: vi.fn(),
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

  it('creates a session: stores sid in redis and sets cookie', async () => {
    // replace the redis import before loading the module
    vi.mock('../src/services/redis', () => ({ redis: mockRedis }))

    const { session } = await import('../src/services/session')

    const reply = makeReply()
    mockRedis.set.mockResolvedValueOnce(undefined as any)

    const sid = await session.create(reply, 'uid-1')

    expect(typeof sid).toBe('string')
    expect(mockRedis.set).toHaveBeenCalled()
    expect(reply.setCookie).toHaveBeenCalledWith('sid', sid, expect.objectContaining({ httpOnly: true }))
  })

  it('gets a session: returns null for missing sid and uid when present', async () => {
    vi.mock('../src/services/redis', () => ({ redis: mockRedis }))
    const { session } = await import('../src/services/session')

    mockRedis.get.mockResolvedValue(null as any)
    let res = await session.get(undefined)
    expect(res).toBeNull()

    mockRedis.get.mockResolvedValue(null as any)
    res = await session.get('nope')
    expect(res).toBeNull()

    mockRedis.get.mockResolvedValue('uid-xyz')
    res = await session.get('some-sid')
    expect(res).toBe('uid-xyz')
  })

  it('destroys a session: deletes redis key and clears cookie', async () => {
    vi.mock('../src/services/redis', () => ({ redis: mockRedis }))
    const { session } = await import('../src/services/session')

    const reply = makeReply()
    mockRedis.del.mockResolvedValueOnce(undefined as any)

    await session.destroy(reply, 'sid-123')

    expect(mockRedis.del).toHaveBeenCalled()
    expect(reply.clearCookie).toHaveBeenCalledWith('sid')
  })

  it('refreshes ttl: calls redis.expire with proper key', async () => {
    vi.mock('../src/services/redis', () => ({ redis: mockRedis }))
    const { session } = await import('../src/services/session')

    mockRedis.expire.mockResolvedValueOnce(undefined as any)
    await session.refreshTtl('sid-789')
    expect(mockRedis.expire).toHaveBeenCalled()
  })
})
