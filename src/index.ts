import Fastify, { type FastifyInstance } from 'fastify'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import { testConnection } from './services/db.js'
import { initRedis } from './services/session.js'
import { userRoutes } from './routes/userRoutes.js'

const fastify: FastifyInstance = Fastify({
	logger: true,
});

if (process.env.COOKIE_SECRET) {
	fastify.register(cookie, { secret: process.env.COOKIE_SECRET });
} else {
	fastify.register(cookie);
}

fastify.register(cors, {
	origin: 'http://localhost:5173',
	credentials: true,
	methods: ['GET', 'POST']
});

await fastify.register(userRoutes, { prefix: '/api' });

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

async function shutdown() {
	try {
		await fastify.close();
	} finally {
		process.exit(0);
	}
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
