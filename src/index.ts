import Fastify, { type FastifyInstance } from 'fastify'
import * as argon2 from 'argon2';
import { testConnection } from './db/db.js'
import { setupAuth, type AuthService } from './auth.js'
import { userRepo } from './db/user.js'

const fastify: FastifyInstance = Fastify({
  logger: true,
});

const { registerUser, verifyUser }: AuthService = setupAuth(userRepo, {
  hash: async (password, options) => {
    return argon2.hash(password, { timeCost: options?.timeCost ?? 3 });
  },
  verify: async (hash, password) => {
    return argon2.verify(hash, password);
  }
});


/* Routes */
fastify.get('/', async () => {
  return { hello: 'world' };
});

fastify.get('/health', async (_, reply) => {
  try {
    await testConnection();
    return { ok: true };
  } catch (err) {
    return reply.code(500).send({ ok: false, error: String(err) });
  }
});

// Register endpoint: create an account with email + password
fastify.post('/register', async (request, reply) => {
  const body = request.body as { email?: string; password?: string }
  if (!body || typeof body.email !== 'string' || typeof body.password !== 'string') {
    return reply.code(400).send({ error: 'email and password are required' })
  }

  try {
    const result = await registerUser(body.email, body.password)
    if (!result.ok) return reply.code(result.code ?? 400).send({ error: result.message })
    return reply.code(201).send({ ok: true, id: result.userId })
  } catch (err) {
    request.log.error(err)
    return reply.code(500).send({ error: 'registration failed' })
  }
})

// Auth endpoint: verify credentials
fastify.post('/auth', async (request, reply) => {
  const body = request.body as { email?: string; password?: string }
  if (!body || typeof body.email !== 'string' || typeof body.password !== 'string') {
    return reply.code(400).send({ error: 'email and password are required' })
  }

  try {
    const result = await verifyUser(body.email, body.password)
    if (!result.ok) return reply.code(result.code ?? 401).send({ error: result.message })
    return { ok: true }
  } catch (err) {
    request.log.error(err)
    return reply.code(500).send({ error: 'authentication failed' })
  }
})


/* Process */
async function start() {
  try {
    // Verify DB connection before accepting traffic
    await testConnection();
    await fastify.listen({ port: 3000 });
    fastify.log.info('server started');
  } catch (err) {
    fastify.log.error(err);
    await fastify.close();
    process.exit(1);
  }
}

start();

// Graceful shutdown
const shutdown = async () => {
  try {
    await fastify.close();
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);