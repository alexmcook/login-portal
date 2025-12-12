import type { SessionData } from '../session';

declare module 'fastify' {
  interface FastifyRequest {
    /** Redis-backed session (or `null` when absent) */
    session: SessionData | null;
  }
}

export {};
