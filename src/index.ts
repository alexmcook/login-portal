import Fastify from 'fastify'
import { pool, testConnection } from './db.js'

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