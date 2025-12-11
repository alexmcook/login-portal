import Fastify from 'fastify'
import { pool, testConnection } from './db.js'
import argon2 from 'argon2'
import { createUser, verifyUser } from './auth.js'

const fastify = Fastify({
  logger: true,
})

fastify.get('/', async (request, reply) => {
  return { hello: 'world' }
})

fastify.get('/health', async (request, reply) => {
  try {
    await testConnection()
    return { ok: true }
  } catch (err) {
    return reply.code(500).send({ ok: false, error: String(err) })
  }
})

// Simple hashing endpoint for testing bcrypt
fastify.post('/hash', async (request, reply) => {
  const body = request.body as { data?: string; rounds?: number }
  if (!body || typeof body.data !== 'string' || body.data.length === 0) {
    return reply.code(400).send({ error: 'missing `data` in request body' })
  }

  // Map `rounds` to Argon2 `timeCost`. Default to 3 (reasonable dev default).
  const timeCost = typeof body.rounds === 'number' ? Math.max(1, body.rounds) : 3
  try {
    const hash = await argon2.hash(body.data, { timeCost })
    return { hash }
  } catch (err) {
    request.log.error(err)
    return reply.code(500).send({ error: 'hashing failed' })
  }
})

// Register endpoint: create an account with email + password
fastify.post('/register', async (request, reply) => {
  const body = request.body as { email?: string; password?: string }
  if (!body || typeof body.email !== 'string' || typeof body.password !== 'string') {
    return reply.code(400).send({ error: 'email and password are required' })
  }

  try {
    const result = await createUser(body.email, body.password)
    if (!result.ok) return reply.code(result.code ?? 400).send({ error: result.message })
    return reply.code(201).send({ ok: true, user: result.user })
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

async function start() {
  try {
    // Verify DB connection before accepting traffic
    await testConnection()
    await fastify.listen({ port: 3000 })
    fastify.log.info('server started')
  } catch (err) {
    fastify.log.error(err)
    await pool.end().catch(() => {})
    process.exit(1)
  }
}

start()

// Graceful shutdown
const shutdown = async () => {
  try {
    await fastify.close()
    await pool.end()
  } finally {
    process.exit(0)
  }
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)