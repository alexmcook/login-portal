import { describe, it, expect, vi, beforeEach } from 'vitest'

function makeReply() {
  return {
    code: vi.fn().mockReturnThis(),
    send: vi.fn()
  } as any
}

function makeRequest() {
  return {
    body: undefined,
    cookies: {},
    log: { error: vi.fn(), warn: vi.fn() }
  } as any
}

describe('user controller', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    process.env.NODE_ENV = 'development'
  })

  it('preHandler sets session null when no sid and sets uid when present', async () => {
    const mockSession = { get: vi.fn().mockResolvedValue('uid-1'), refreshTtl: vi.fn(), create: vi.fn(), destroy: vi.fn() }
    vi.doMock('../src/services/session.js', () => ({ session: mockSession }))

    const { preHandler } = await import('../src/controllers/user')

    const req1 = makeRequest()
    await preHandler(req1, {} as any)
    expect(req1.session).toBeNull()

    const req2 = makeRequest()
    req2.cookies.sid = 's1'
    await preHandler(req2, {} as any)
    expect(req2.session).toEqual({ uid: 'uid-1' })
    expect(mockSession.refreshTtl).toHaveBeenCalledWith('s1')
  })

  it('registerHandler validates input and uses auth.registerUser', async () => {
    const auth = { registerUser: vi.fn().mockResolvedValue({ ok: true, activationUrl: 'http://x' }) }
    vi.doMock('../src/services/authFactory.js', () => auth)
    process.env.NODE_ENV = 'development'

    const { registerHandler } = await import('../src/controllers/user')

    const reply = makeReply()
    const badReq = makeRequest()
    badReq.body = { email: 'bad', password: '1' }
    await registerHandler(badReq, reply)
    expect(reply.code).toHaveBeenCalledWith(400)

    const goodReq = makeRequest()
    goodReq.body = { email: 'a@b.com', password: 'Str0ng!Pass' }
    await registerHandler(goodReq, reply)
    expect(auth.registerUser).toHaveBeenCalledWith('a@b.com', 'Str0ng!Pass')
    expect(reply.code).toHaveBeenCalledWith(201)
  })

  it('activateHandler delegates to auth.activateUser', async () => {
    const auth = { activateUser: vi.fn().mockResolvedValue({ ok: true }) }
    vi.doMock('../src/services/authFactory.js', () => auth)
    const { activateHandler } = await import('../src/controllers/user')

    const reply = makeReply()
    const req = makeRequest()
    req.body = { token: 't' }
    await activateHandler(req, reply)
    expect(auth.activateUser).toHaveBeenCalledWith('t')
    expect(reply.code).toHaveBeenCalledWith(200)
  })

  it('loginHandler verifies and creates session', async () => {
    const auth = { verifyUser: vi.fn().mockResolvedValue({ ok: true, userId: 'u1' }) }
    const mockSession = { create: vi.fn().mockResolvedValue('sid-1') }
    const userRepo = { setLastLogin: vi.fn().mockResolvedValue(undefined) }

    vi.doMock('../src/services/authFactory.js', () => auth)
    vi.doMock('../src/services/session.js', () => ({ session: mockSession }))
    vi.doMock('../src/repositories/user.js', () => ({ userRepo }))

    const { loginHandler } = await import('../src/controllers/user')

    const reply = makeReply()
    const req = makeRequest()
    req.body = { email: 'a@b.com', password: 'pw' }

    await loginHandler(req, reply)
    expect(auth.verifyUser).toHaveBeenCalledWith('a@b.com', 'pw')
    expect(mockSession.create).toHaveBeenCalled()
    expect(userRepo.setLastLogin).toHaveBeenCalledWith('u1')
    expect(reply.code).toHaveBeenCalledWith(201)
  })

  it('logoutHandler destroys session when sid present', async () => {
    const mockSession = { destroy: vi.fn().mockResolvedValue(undefined) }
    vi.doMock('../src/services/session.js', () => ({ session: mockSession }))
    const { logoutHandler } = await import('../src/controllers/user')

    const reply = makeReply()
    const req = makeRequest()
    req.cookies.sid = 's1'
    await logoutHandler(req, reply)
    expect(mockSession.destroy).toHaveBeenCalledWith(reply, 's1')
    expect(reply.code).toHaveBeenCalledWith(200)
  })

  it('deactivateHandler validates and calls auth.deactivateUser then destroys session', async () => {
    const auth = { deactivateUser: vi.fn().mockResolvedValue({ ok: true }) }
    const mockSession = { get: vi.fn().mockResolvedValue('u1'), destroy: vi.fn().mockResolvedValue(undefined) }
    vi.doMock('../src/services/authFactory.js', () => auth)
    vi.doMock('../src/services/session.js', () => ({ session: mockSession }))

    const { deactivateHandler } = await import('../src/controllers/user')
    const reply = makeReply()
    const req = makeRequest()
    req.cookies.sid = 's1'
    req.body = { password: 'pw' }

    await deactivateHandler(req, reply)
    expect(auth.deactivateUser).toHaveBeenCalledWith('u1', 'pw')
    expect(mockSession.destroy).toHaveBeenCalledWith(reply, 's1')
    expect(reply.code).toHaveBeenCalledWith(200)
  })

  it('secureHandler rejects unauthorized and returns user on success', async () => {
    const userRepo = { findById: vi.fn().mockResolvedValue({ success: true, user: { id: 'u1' } }) }
    vi.doMock('../src/repositories/user.js', () => ({ userRepo }))
    const { secureHandler } = await import('../src/controllers/user')

    const reply = makeReply()
    const reqBad = makeRequest()
    await secureHandler(reqBad, reply)
    expect(reply.code).toHaveBeenCalledWith(401)

    const req = makeRequest()
    req.session = { uid: 'u1' }
    await secureHandler(req, reply)
    expect(userRepo.findById).toHaveBeenCalledWith('u1')
    expect(reply.code).toHaveBeenCalledWith(200)
  })

  it('resetHandler returns generic ok for unknown email and returns reset URL in dev', async () => {
    const userRepo = { createPasswordResetUrl: vi.fn().mockResolvedValue({ success: false }) }
    vi.doMock('../src/repositories/user.js', () => ({ userRepo }))
    const { resetHandler } = await import('../src/controllers/user')

    const reply = makeReply()
    const reqBad = makeRequest()
    reqBad.body = { email: 'bad' }
    await resetHandler(reqBad, reply)
    expect(reply.code).toHaveBeenCalledWith(400)

    const req = makeRequest()
    req.body = { email: 'a@b.com' }
    userRepo.createPasswordResetUrl.mockResolvedValueOnce({ success: true, url: 'http://x' })
    await resetHandler(req, reply)
    expect(reply.code).toHaveBeenCalledWith(201)
  })

  it('setHandler validates and calls auth.updatePassword', async () => {
    const auth = { updatePassword: vi.fn().mockResolvedValue(undefined) }
    vi.doMock('../src/services/authFactory.js', () => auth)
    const { setHandler } = await import('../src/controllers/user')

    const reply = makeReply()
    const reqBad = makeRequest()
    reqBad.body = { token: 't', password: 'bad' }
    await setHandler(reqBad, reply)
    expect(reply.code).toHaveBeenCalledWith(400)

    const req = makeRequest()
    req.body = { token: 't', password: 'Str0ng!Pass' }
    await setHandler(req, reply)
    expect(auth.updatePassword).toHaveBeenCalledWith('t', 'Str0ng!Pass')
    expect(reply.code).toHaveBeenCalledWith(200)
  })
})
