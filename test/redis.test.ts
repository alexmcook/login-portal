import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('redis service', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    // ensure env used by service
    process.env.REDIS_HOST = 'localhost'
    process.env.REDIS_PORT = '6379'
    delete process.env.REDIS_PASSWORD
  })

  it('set/get/del/expire/exists/quit invoke client methods', async () => {
    const clientMock: any = {
      connect: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      setEx: vi.fn().mockResolvedValue(undefined),
      set: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue('the-value'),
      del: vi.fn().mockResolvedValue(undefined),
      expire: vi.fn().mockResolvedValue(undefined),
      quit: vi.fn().mockResolvedValue(undefined),
      exists: vi.fn().mockResolvedValue(1),
    }

    // use non-hoisted mock so clientMock is in scope
    vi.doMock('redis', () => ({ createClient: (opts: any) => clientMock }))

    const { redis } = await import('../src/services/redis')

    await redis.set('k1', 'v1', 10)
    expect(clientMock.setEx).toHaveBeenCalledWith('k1', 10, 'v1')

    await redis.set('k2', 'v2')
    expect(clientMock.set).toHaveBeenCalledWith('k2', 'v2')

    const val = await redis.get('k1')
    expect(clientMock.get).toHaveBeenCalledWith('k1')
    expect(val).toBe('the-value')

    await redis.del('k1')
    expect(clientMock.del).toHaveBeenCalledWith('k1')

    await redis.expire('k1', 60)
    expect(clientMock.expire).toHaveBeenCalledWith('k1', 60)

    const ex = await redis.exists('k1')
    expect(clientMock.exists).toHaveBeenCalledWith('k1')
    expect(ex).toBe(true)

    await redis.quit()
    expect(clientMock.quit).toHaveBeenCalled()
  })
})
