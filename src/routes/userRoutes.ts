import { type FastifyInstance, type FastifyPluginOptions, type FastifyRequest, type FastifyReply } from 'fastify'
import * as argon2 from 'argon2';
import { setupAuth } from '../services/auth.js'
import { userRepo } from '../repositories/user.js'
import { session } from '../services/session.js'

import { validateEmail, validatePassword } from '../utils/validator.js';
import { config } from '../config.js';

const { registerUser, activateUser, verifyUser, updatePassword } = setupAuth(userRepo, {
  hash: async (password, options) => {
    return argon2.hash(password, { timeCost: options?.timeCost ?? 3 });
  },
  verify: async (hash, password) => {
    return argon2.verify(hash, password);
  }
});

async function finalizeLogin(request: FastifyRequest, reply: FastifyReply, userId: string) {
  await userRepo.setLastLogin(userId);
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
        await session.refreshTtl(sid);
      }
    } catch (err) {
      request.log.warn({ err }, 'session load failed');
      request.session = null;
    }
  });

  fastify.post('/register', async (request, reply) => {
    const body = request.body as { email?: string; password?: string };
    if (!validateEmail(body?.email ?? '') || !validatePassword(body?.password ?? '')) {
      return reply.code(400).send({ error: 'invalid email or password format' });
    }
    try {
      const result = await registerUser(body.email ?? '', body.password ?? '');
      if (!result.ok) return reply.code(result.code ?? 400).send({ error: result.message });
      if (config.NODE_ENV !== 'production') {
        return reply.code(201).send({ ok: true, activationUrl: result.activationUrl });
      } else {
        // send activation email
        return reply.code(201).send({ ok: true });
      }
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'registration failed' });
    }
  });

  fastify.post('/activate', async (request, reply) => {
    const body = request.body as { token?: string };
    try {
      const result = await activateUser(body.token ?? '');
      if (!result.ok) return reply.code(result.code ?? 400).send({ error: result.message });
      return reply.code(200).send({ ok: true });
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'activation failed' });
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

  fastify.post('/deactivate', async (request, reply) => {
    const sid = request.cookies?.sid as string | undefined;
    if (!sid) {
      return reply.code(400).send({ ok: false });
    }
    const uid = await session.get(sid);
    if (!uid) {
      return reply.code(400).send({ ok: false });
    }
    const body = request.body as { password?: string };
    if (!body || typeof body.password !== 'string') {
      return reply.code(400).send({ error: 'password is required' });
    }

    try {
      const result = await userRepo.findById(uid);
      if (!result.success || !result.user) {
        return reply.code(404).send({ error: 'user not found' });
      }
      const valid = await argon2.verify(result.user.password_hash!, body.password);
      if (!valid) {
        return reply.code(401).send({ error: 'invalid credentials' });
      }

      // deactivate user
      await userRepo.deleteUser(uid);
      await session.destroy(reply, sid);
      return reply.code(200).send({ ok: true });
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'deactivation failed' });
    }
  });

  fastify.get('/secure', async (request, reply) => {
    const session = request.session;
    if (!session || typeof session.uid === 'undefined') {
      return reply.code(401).send({ error: 'unauthorized' });
    }

    try {
      const uid = session.uid;
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

  fastify.post('/reset', async (request, reply) => {
    const body = request.body as { email?: string };
    if (!body || typeof body.email !== 'string' || !validateEmail(body.email)) {
      return reply.code(400).send({ error: 'valid email is required' });
    }

    try {
      const result = await userRepo.createPasswordResetUrl(body.email);
      if (!result.success) {
        return reply.code(200).send({ ok: true }); // avoid revealing user existence
      }

      if (config.NODE_ENV !== 'production') {
        return reply.code(201).send({ ok: true, resetUrl: result.url });
      } else {
        // send activation email
        return reply.code(201).send({ ok: true });
      }
      return reply.code(200).send({ ok: true });
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'password reset failed' });
    }
  });

  fastify.post('/set', async (request, reply) => {
    const body = request.body as { token?: string, password?: string };

    if (!body || typeof body.token !== 'string' || typeof body.password !== 'string' || !validatePassword(body.password)) {
      return reply.code(400).send({ error: 'invalid password format' });
    }

    if (!body.token) {
      return reply.code(400).send({ error: 'token is required' });
    }

    try {
      await updatePassword(body.token, body.password);
      return reply.code(200).send({ ok: true });
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'password reset failed' });
    }
  });
}
