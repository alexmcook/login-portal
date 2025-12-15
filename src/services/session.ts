import { redis } from './redis.js';
import crypto from 'crypto';
import type { FastifyReply } from 'fastify';

const SESSION_PREFIX = 'sess:';
const SESSION_TTL = 60 * 60 * 24; // 24h

export type SessionData = {
  uid: string;
  [key: string]: unknown;
};

function sidToKey(sid: string) {
  return `${SESSION_PREFIX}${sid}`;
}

export function generateSid() {
  return crypto.randomBytes(16).toString('hex');
}

export async function createSession(reply: FastifyReply, data: SessionData) {
  const sid = generateSid();
  const key = sidToKey(sid);
  const value = JSON.stringify(data);
  await redis.set(key, SESSION_TTL, value);
  // set cookie
  reply.setCookie('sid', sid, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL,
  });
  return sid;
}

export async function getSession(sid: string | undefined) {
  if (!sid) return null;
  const key = sidToKey(sid);
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SessionData;
    return parsed;
  } catch (err) {
    return null;
  }
}

export async function destroySession(reply: FastifyReply, sid?: string) {
  if (sid) {
    const key = sidToKey(sid);
    await redis.del(key);
  }
  reply.clearCookie('sid');
}

export async function refreshSessionTtl(sid: string) {
  const key = sidToKey(sid);
  await redis.expire(key, SESSION_TTL);
}
