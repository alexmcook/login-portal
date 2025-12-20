import { createClient, type RedisClientType } from 'redis';
import { config } from '../config.js';

export const redis = { exists, set, get, del, expire, quit };

const clientPromise: Promise<RedisClientType> = init();

async function init(): Promise<RedisClientType> {
  const host = config.REDIS_HOST;
  const port = config.REDIS_PORT;
  const password = config.REDIS_PASSWORD;
  let redisUrl;
  if (password) {
    redisUrl = `redis://:${encodeURIComponent(password)}@${host}:${port}`;
  } else {
    redisUrl = `redis://${host}:${port}`;
  }
  const client = createClient({ url: redisUrl });
  client.on('error', (err) => console.error('Redis error', err));
  await client.connect();
  return client;
}

async function exists(key: string): Promise<boolean> {
  const client = await clientPromise;
  const exists = await client.exists(key);
  return exists === 1;
}

async function set(key: string, value: string, ttlSeconds?: number) {
  const client = await clientPromise;
  if (ttlSeconds) {
    await client.setEx(key, ttlSeconds, value);
  } else {
    await client.set(key, value);
  }
}

async function get(key: string): Promise<string | null> {
  const client = await clientPromise;
  return client.get(key);
}

async function del(key: string): Promise<void> {
  const client = await clientPromise;
  await client.del(key);
}

async function expire(key: string, ttlSeconds: number): Promise<void> {
  const client = await clientPromise;
  await client.expire(key, ttlSeconds);
}

async function quit(): Promise<void> {
  const client = await clientPromise;
  await client.quit();
}
