import { createClient, type RedisClientType } from 'redis';
import crypto from 'crypto';
import type { FastifyReply } from 'fastify';

const SESSION_PREFIX = 'sess:';
const SESSION_TTL = 60 * 60 * 24; // 24h

let client: RedisClientType | null = null;

export type SessionData = {
  uid: string;
  [key: string]: unknown;
};

export async function initRedis() {
  const host = process.env.REDIS_HOST ?? '127.0.0.1';
  const port = process.env.REDIS_PORT ?? '6379';
  const password = process.env.REDIS_PASSWORD;
  let redisUrl;
  if (password) {
    redisUrl = `redis://:${encodeURIComponent(password)}@${host}:${port}`;
  } else {
    redisUrl = `redis://${host}:${port}`;
  }
  client = createClient({ url: redisUrl });
  client.on('error', (err) => console.error('Redis error', err));
  await client.connect();
  return client;
}

function sidToKey(sid: string) {
  return `${SESSION_PREFIX}${sid}`;
}

export function generateSid() {
  return crypto.randomBytes(16).toString('hex');
}

export async function createSession(reply: FastifyReply, data: SessionData) {
  if (!client) throw new Error('Redis client not initialized');
  const sid = generateSid();
  const key = sidToKey(sid);
  const value = JSON.stringify(data);
  await client.setEx(key, SESSION_TTL, value);
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
  if (!client) throw new Error('Redis client not initialized');
  if (!sid) return null;
  const key = sidToKey(sid);
  const raw = await client.get(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SessionData;
    return parsed;
  } catch (err) {
    return null;
  }
}

export async function destroySession(reply: FastifyReply, sid?: string) {
  if (!client) throw new Error('Redis client not initialized');
  if (!sid) {
    // clear cookie anyway
    reply.clearCookie('sid');
    return;
  }
  const key = sidToKey(sid);
  await client.del(key);
  reply.clearCookie('sid');
}

export async function refreshSessionTtl(sid: string) {
  if (!client) throw new Error('Redis client not initialized');
  const key = sidToKey(sid);
  await client.expire(key, SESSION_TTL);
}

export function getClient() {
  if (!client) throw new Error('Redis client not initialized');
  return client;
}
