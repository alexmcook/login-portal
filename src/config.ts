import fs from 'fs'
import path from 'path'

export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  SERVER_PORT: process.env.SERVER_PORT,
  POSTGRES_HOST: process.env.POSTGRES_HOST,
  POSTGRES_PORT: process.env.POSTGRES_PORT ?? '5432',
  POSTGRES_USER: process.env.POSTGRES_USER,
  POSTGRES_PASSWORD: readSecret('POSTGRES_PASSWORD'),
  POSTGRES_DB: process.env.POSTGRES_DB,
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: process.env.REDIS_PORT ?? '6379',
  REDIS_PASSWORD: readSecret('REDIS_PASSWORD'),
  ACTIVATION_SECRET: readSecret('ACTIVATION_SECRET'),
  PASSWORD_RESET_SECRET: readSecret('PASSWORD_RESET_SECRET'),
  JWT_SECRET: readSecret('JWT_SECRET'),
  JWT_TTL_SECONDS: process.env.JWT_TTL_SECONDS ?? '900',
  REFRESH_TTL_SECONDS: process.env.REFRESH_TTL_SECONDS ?? String(60 * 60 * 24),
  AWS_REGION: process.env.AWS_REGION,
  EMAIL_ENABLED: process.env.EMAIL_ENABLED === 'true',
  EMAIL_SOURCE: process.env.EMAIL_SOURCE,
  APPROVED_EMAIL: readSecret('APPROVED_EMAIL'),
  APP_URL: readSecret('APP_URL'),
}

function readSecret(envVar: string): string | undefined {
  if (process.env[envVar]) {
    return process.env[envVar];
  }
  try {
    const fullPath = path.resolve('/run/secrets/', envVar);
    return fs.readFileSync(fullPath, 'utf8').trim();
  } catch {
    return undefined;
  }
}
