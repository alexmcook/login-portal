import { type FastifyInstance, type FastifyPluginOptions, type FastifyRequest, type FastifyReply } from 'fastify'
import * as argon2 from 'argon2';
import { setupAuth } from '../services/auth.js'
import { userRepo } from '../repositories/user.js'
import { session } from '../services/session.js'
import { sendEmail } from '../services/email.js'

const { registerUser, verifyUser } = setupAuth(userRepo, {
  hash: async (password, options) => {
    return argon2.hash(password, { timeCost: options?.timeCost ?? 3 });
  },
  verify: async (hash, password) => {
    return argon2.verify(hash, password);
  }
});

async function finalizeLogin(request: FastifyRequest, reply: FastifyReply, userId: string) {
  userRepo.setLastLogin(userId);
  try {
    await session.create(reply, userId);
  } catch (err) {
    request.log.warn({ err }, 'failed to create session');
  }
  return reply.code(201).send({ ok: true, id: userId });
}

export async function userRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  fastify.addHook('preHandler', async (request, _reply) => {
    try {
      const sid = request.cookies?.sid as string | undefined;
      if (!sid) {
        request.session = null;
        return;
      }
      const value = await session.get(sid);
      request.session = { uid: value };
      if (value) {
        void session.refreshTtl(sid).catch(() => {});
      }
    } catch (err) {
      request.log.warn({ err }, 'session load failed');
      request.session = null;
    }
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

  fastify.post('/logout', async (request, reply) => {
    const sid = request.cookies?.sid as string | undefined;
    if (sid) {
      await session.destroy(reply, sid);
      return reply.code(200).send({ ok: true });
    }
    return reply.code(400).send({ ok: false });
  });

  fastify.get('/secure', async (request, reply) => {
    const session = request.session;
    if (!session || typeof session.uid === 'undefined') {
      return reply.code(401).send({ error: 'unauthorized' });
    }

    try {
      const uid = String(session.uid);
      const res = await userRepo.findById(uid);
      if (!res.success || !res.user) {
        return reply.code(401).send({ error: 'unauthorized' });
      }

      return reply.code(200).send({ ok: true, user: res.user });
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'internal' });
    }
  });

  // small test route (registered at top level, not inside /secure handler)
  fastify.get('/test', async (request, reply) => {
    await sendEmail('test@example.com', 'Test Subject', 'This is a test email body');
    return reply.code(200).send({ ok: true });
  });
}
