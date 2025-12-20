import { type FastifyInstance, type FastifyPluginOptions, type FastifyRequest, type FastifyReply } from 'fastify'
import * as controller from '../controllers/user.js';

export async function routes(fastify: FastifyInstance, _options: FastifyPluginOptions) {
  fastify.addHook('preHandler', controller.preHandler);
  fastify.post('/register', controller.registerHandler);
  fastify.post('/activate', controller.activateHandler);
  fastify.post('/login', controller.loginHandler);
  fastify.post('/logout', controller.logoutHandler);
  fastify.post('/deactivate', controller.deactivateHandler);
  fastify.get('/secure', controller.secureHandler);
  fastify.post('/reset', controller.resetHandler);
  fastify.post('/set', controller.setHandler);
}
