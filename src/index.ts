import Fastify, { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify'
import cookie from '@fastify/cookie'
import * as argon2 from 'argon2';
import { testConnection } from './db/db.js'
import { setupAuth } from './auth.js'
import { userRepo } from './db/user.js'
import { initRedis, createSession, getSession, refreshSessionTtl } from './session.js'

const fastify: FastifyInstance = Fastify({
  logger: true,
});

if (process.env.COOKIE_SECRET) {
  fastify.register(cookie, { secret: process.env.COOKIE_SECRET });
} else {
  fastify.register(cookie);
}

fastify.addHook('preHandler', async (request, _) => {
  try {
    const sid = request.cookies?.sid as string | undefined;
    if (!sid) {
      request.session = null;
      return;
    }
    const s = await getSession(sid);
    request.session = s;
    if (s) {
      void refreshSessionTtl(sid).catch(() => {});
    }
  } catch (err) {
    request.log.warn({ err }, 'session load failed');
    request.session = null;
  }
});

const { registerUser, verifyUser } = setupAuth(userRepo, {
  hash: async (password, options) => {
    return argon2.hash(password, { timeCost: options?.timeCost ?? 3 });
  },
  verify: async (hash, password) => {
    return argon2.verify(hash, password);
  }
});


fastify.get('/', async () => {
  return { hello: 'world' };
});

fastify.post('/register', async (request, reply) => {
  const body = request.body as { email?: string; password?: string };
  if (!body || typeof body.email !== 'string' || typeof body.password !== 'string') {
    return reply.code(400).send({ error: 'email and password are required' });
  }

    try {
    const result = await registerUser(body.email, body.password);
    if (!result.ok) return reply.code(result.code ?? 400).send({ error: result.message });
    // create session cookie
    return await finalizeLogin(request, reply, result.userId!);
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ error: 'registration failed' });
  }
});

fastify.post('/login', async (request, reply) => {
  const body = request.body as { email?: string; password?: string };
  if (!body || typeof body.email !== 'string' || typeof body.password !== 'string') {
    return reply.code(400).send({ error: 'email and password are required' });
  }

  try {
    const result = await verifyUser(body.email, body.password);
    if (!result.ok) return reply.code(result.code ?? 400).send({ error: result.message });
    return await finalizeLogin(request, reply, result.userId!);
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ error: 'login failed' });
  }
});

async function finalizeLogin(request: FastifyRequest, reply: FastifyReply, userId: string) {
  try {
    await createSession(reply, { uid: userId });
  } catch (err) {
    request.log.warn({ err }, 'failed to create session');
  }
  return reply.code(201).send({ ok: true, id: userId });
}

/* Process */
async function start() {
  try {
    await testConnection();
    await initRedis();
    await fastify.listen({ port: 3000 });
    fastify.log.info('server started');
  } catch (err) {
    fastify.log.error(err);
    await fastify.close();
    process.exit(1);
  }
}

start();

const shutdown = async () => {
  try {
    await fastify.close();
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);