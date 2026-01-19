import { createClient, type RedisClientType } from 'redis';
import { config } from '../config.js';

export const redis = { exists, set, get, del, expire, quit };

let clientPromise: Promise<any> | null = null
function getClientPromise(): Promise<any> {
  if (!clientPromise) {
    clientPromise = init();
  }
  return clientPromise;
}

async function init(): Promise<any> {
  const host = config.REDIS_HOST;
  const port = config.REDIS_PORT;
  const password = config.REDIS_PASSWORD;

  if (!host) throw new Error('REDIS_HOST is not configured')
  if (!port) throw new Error('REDIS_PORT is not configured')

  const hostStr = String(host)
  const portStr = String(port)

  let redisUrl;
  if (password) {
    redisUrl = `redis://:${encodeURIComponent(String(password))}@${hostStr}:${portStr}`;
  } else {
    redisUrl = `redis://${hostStr}:${portStr}`;
  }

  const client = createClient({ url: redisUrl });
  client.on('error', (err) => process.stderr.write(`Redis error ${String(err)}\n`));
  await client.connect();
  return client;
}

async function exists(key: string): Promise<boolean> {
  const client = await getClientPromise();
  const exists = await client.exists(key);
  return exists === 1;
}

async function set(key: string, value: string, ttlSeconds?: number) {
  const client = await getClientPromise();
  if (ttlSeconds) {
    await client.setEx(key, ttlSeconds, value);
  } else {
    await client.set(key, value);
  }
}

async function get(key: string): Promise<string | null> {
  const client = await getClientPromise();
  return client.get(key);
}

async function del(key: string): Promise<void> {
  const client = await getClientPromise();
  await client.del(key);
}

async function expire(key: string, ttlSeconds: number): Promise<void> {
  const client = await getClientPromise();
  await client.expire(key, ttlSeconds);
}

async function quit(): Promise<void> {
  const client = await getClientPromise();
  await client.quit();
}
