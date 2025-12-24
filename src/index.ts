import Fastify, { type FastifyInstance } from 'fastify'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import { redis } from './services/redis.js'
import { routes } from './routes/user.js'
import { config } from './config.js'
import { postgres } from './services/postgres.js'

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
		fastify.log.info('Checking Postgres connectivity...');
		// retry a few times in case Postgres is still coming up
		for (let i = 0; i < 10; i++) {
			try {
				await postgres.query('SELECT 1');
				fastify.log.info('Postgres is reachable');
				break;
			} catch (err) {
				fastify.log.warn(`Postgres not ready, retrying (${i + 1}/10)`);
				await new Promise((r) => setTimeout(r, 1000));
				if (i === 9) throw err;
			}
		}

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
