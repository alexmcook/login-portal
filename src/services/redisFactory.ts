import { type RedisClientType } from 'redis';

export type RedisLike = {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttlSeconds?: number): Promise<void>
  del(key: string): Promise<void>
  expire(key: string, ttlSeconds: number): Promise<void>
  exists(key: string): Promise<boolean>
  quit(): Promise<void>
}

// Wrap a real redis client (node-redis) into the RedisLike interface
export function createRealRedis(client: any): RedisLike {
  return {
    get: async (key: string) => client.get(key),
    set: async (key: string, value: string, ttlSeconds?: number) => {
      if (typeof ttlSeconds === 'number') {
        // node-redis has setEx
        if (typeof client.setEx === 'function') {
          await client.setEx(key, ttlSeconds, value);
        } else {
          await client.set(key, value);
          if (typeof client.expire === 'function') await client.expire(key, ttlSeconds);
        }
      } else {
        await client.set(key, value);
      }
    },
    del: async (key: string) => { await client.del(key); },
    expire: async (key: string, ttlSeconds: number) => { await client.expire(key, ttlSeconds); },
    exists: async (key: string) => {
      const res = await client.exists(key);
      return res === 1;
    },
    quit: async () => { if (typeof client.quit === 'function') await client.quit(); }
  }
}

// In-memory mock redis for unit tests
export function createMockRedis(): RedisLike {
  const store = new Map<string, { v: string; expiresAt?: number }>();

  function now() { return Date.now(); }

  return {
    get: async (key: string) => {
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expiresAt && entry.expiresAt < now()) { store.delete(key); return null; }
      return entry.v;
    },
    set: async (key: string, value: string, ttlSeconds?: number) => {
      const expiresAt = ttlSeconds ? now() + ttlSeconds * 1000 : undefined;
      store.set(key, { v: value, expiresAt });
    },
    del: async (key: string) => { store.delete(key); },
    expire: async (key: string, ttlSeconds: number) => {
      const entry = store.get(key);
      if (!entry) return;
      entry.expiresAt = now() + ttlSeconds * 1000;
      store.set(key, entry);
    },
    exists: async (key: string) => {
      const entry = store.get(key);
      if (!entry) return false;
      if (entry.expiresAt && entry.expiresAt < now()) { store.delete(key); return false; }
      return true;
    },
    quit: async () => { store.clear(); }
  }
}
