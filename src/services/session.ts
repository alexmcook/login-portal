import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import type { FastifyReply } from 'fastify'
import { config } from '../config.js'
import { redis } from './redis.js'

export const session = { create, destroy, get, refreshTtl, refresh }

const ACCESS_COOKIE = 'sid'
const REFRESH_COOKIE = 'refresh'
const ACCESS_TTL = Number(config.JWT_TTL_SECONDS)
const REFRESH_TTL = Number(config.REFRESH_TTL_SECONDS)
const SECRET = String(config.JWT_SECRET)
if (!SECRET) throw new Error('JWT_SECRET is not configured')

function makeJti(): string { return crypto.randomBytes(16).toString('hex') }
function makeRefresh(): string { return crypto.randomBytes(32).toString('hex') }
function refreshKey(token: string) { return `refresh:${token}` }

// create access JWT and a refresh token (stored in redis)
async function create(reply: FastifyReply, uid: string): Promise<string> {
  const jti = makeJti()
  const access = jwt.sign({ uid, jti }, SECRET, { expiresIn: ACCESS_TTL })

  const refreshToken = makeRefresh()
  await redis.set(refreshKey(refreshToken), uid, REFRESH_TTL)

  reply.setCookie(ACCESS_COOKIE, access, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: config.NODE_ENV === 'production',
    maxAge: ACCESS_TTL,
  })
  reply.setCookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: config.NODE_ENV === 'production',
    maxAge: REFRESH_TTL,
  })

  return access
}

async function get(token: string | undefined): Promise<string | null> {
  if (!token) return null
  try {
    const payload: any = jwt.verify(token, SECRET)
    const jti = payload.jti as string | undefined
    if (!jti) return null
    const blacklisted = await redis.exists(jti)
    if (blacklisted) return null
    return payload.uid as string | null
  } catch {
    return null
  }
}

// destroy both access and refresh tokens: blacklist access jti and delete refresh key
async function destroy(reply: FastifyReply, accessToken?: string, refreshToken?: string) {
  if (accessToken) {
    try {
      const payload: any = jwt.verify(accessToken, SECRET)
      const jti = payload.jti as string | undefined
      const exp = payload.exp as number | undefined
      if (jti && exp) {
        const nowSec = Math.floor(Date.now() / 1000)
        const ttl = Math.max(0, exp - nowSec)
        if (ttl > 0) {
          await redis.set(jti, 'blacklisted', ttl)
        }
      }
    } catch {
      // ignore
    }
  }
  if (refreshToken) {
    try {
      await redis.del(refreshKey(refreshToken))
    } catch {
      // ignore
    }
  }
  reply.clearCookie(ACCESS_COOKIE)
  reply.clearCookie(REFRESH_COOKIE)
}

async function refreshTtl(_token: string) {
  // No-op for JWT approach; could implement sliding tokens if desired
}

// rotate refresh token and issue a new access token
async function refresh(reply: FastifyReply, refreshToken: string | undefined): Promise<string | null> {
  if (!refreshToken) return null
  try {
    const uid = await redis.get(refreshKey(refreshToken))
    if (!uid) return null

    // rotate refresh token
    const newRefresh = makeRefresh()
    await redis.set(refreshKey(newRefresh), uid, REFRESH_TTL)
    await redis.del(refreshKey(refreshToken))

    // issue new access JWT
    const jti = makeJti()
    const access = jwt.sign({ uid, jti }, SECRET, { expiresIn: ACCESS_TTL })

    reply.setCookie(ACCESS_COOKIE, access, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: config.NODE_ENV === 'production',
      maxAge: ACCESS_TTL,
    })
    reply.setCookie(REFRESH_COOKIE, newRefresh, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: config.NODE_ENV === 'production',
      maxAge: REFRESH_TTL,
    })

    return access
  } catch {
    return null
  }
}
