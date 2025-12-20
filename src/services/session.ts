import { redis } from './redis.js';
import crypto from 'crypto';
import type { FastifyReply } from 'fastify';
import { config } from '../config.js';

export const session = { create, destroy, get, refreshTtl };

const SESSION_PREFIX = 'sess:';
const SESSION_TTL = 60 * 60 * 24; // 24h

export type SessionData = {
  uid: string;
  [key: string]: unknown;
};

function sidToKey(sid: string): string {
  return `${SESSION_PREFIX}${sid}`;
}

function generateSid(): string {
  return crypto.randomBytes(16).toString('hex');
}

async function create(reply: FastifyReply, uid: string): Promise<string> {
  const sid = generateSid();
  const key = sidToKey(sid);
  await redis.set(key, uid, SESSION_TTL);
  // set cookie
  reply.setCookie('sid', sid, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: config.NODE_ENV === 'production',
    maxAge: SESSION_TTL,
  });
  return sid;
}

async function get(sid: string | undefined) {
  if (!sid) return null;
  const key = sidToKey(sid);
  const value = await redis.get(key);
  if (!value) return null;
  return value;
}

async function destroy(reply: FastifyReply, sid?: string) {
  if (sid) {
    const key = sidToKey(sid);
    await redis.del(key);
  }
  reply.clearCookie('sid');
}

async function refreshTtl(sid: string) {
  const key = sidToKey(sid);
  await redis.expire(key, SESSION_TTL);
}
