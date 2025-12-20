import Fastify, { type FastifyInstance } from 'fastify'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import { redis } from './services/redis.js'
import { routes } from './routes/user.js'
import { config } from './config.js'

const fastify: FastifyInstance = Fastify({
	logger: true,
});

if (config.COOKIE_SECRET) {
	fastify.register(cookie, { secret: config.COOKIE_SECRET });
} else {
	fastify.register(cookie);
}

const protocol = config.NODE_ENV === 'production' ? 'https' : 'http';
fastify.log.info(`CORS origin set to: ${protocol}://${config.APP_URL}`);
fastify.register(cors, {
	origin: `${protocol}://${config.APP_URL}`,
	credentials: true,
	methods: ['GET', 'POST']
});

await fastify.register(routes, { prefix: '/api' });

async function start() {
	try {
		await fastify.listen({ port: Number(config.SERVER_PORT) });
	} catch (err) {
		fastify.log.error(err);
		await fastify.close();
		process.exit(1);
	}
}

start();

async function shutdown() {
	try {
    await redis.quit();
		await fastify.close();
	} finally {
		process.exit(0);
	}
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
