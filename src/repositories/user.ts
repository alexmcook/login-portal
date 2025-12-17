import { query } from '../services/postgres.js'
import { redis } from '../services/redis.js';
import crypto from 'crypto';

export type UserResult = { success: boolean, user?: UserRow };
export type UserRow = { id?: string; email?: string; password_hash?: string, created_at?: Date, updated_at?: Date, last_login?: Date, is_active?: boolean };

export type UserRepo = {
  findByEmail(email: string): Promise<UserResult>
  findById(id: string): Promise<UserResult>
  createUser(email: string, passwordHash: string): Promise<UserResult>
  setLastLogin(id: string): Promise<void>
  createActivationUrl(userId: string): Promise<string>
  activateUser(token: string): Promise<UserResult>
};

export const userRepo: UserRepo = {
  findById,
  findByEmail,
  createUser,
  setLastLogin,
  createActivationUrl,
  activateUser
};

async function findById(id: string): Promise<UserResult> {
  const result = await query('SELECT id, email, password_hash, created_at, updated_at, last_login FROM users WHERE id = $1', [id]);
  if (result.rows.length === 0) return { success: false };
  return { success: true, user: { ...result.rows[0] }};
}

async function findByEmail(email: string): Promise<UserResult> {
  const result = await query('SELECT id, email, password_hash, is_active FROM users WHERE email = $1', [email]);
  if (result.rows.length === 0) return { success: false };
  return { success: true, user: { ...result.rows[0] }};
}

async function createUser(email: string, passwordHash: string): Promise<UserResult> {
  const result = await query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING RETURNING id, email, password_hash',
    [email, passwordHash]
  );
  if (result.rows.length === 0) return { success: false };
  return { success: true, user: { ...result.rows[0] }};
}

async function setLastLogin(id: string): Promise<void> {
  await query('UPDATE users SET last_login = NOW() WHERE id = $1', [id]);
}

async function createActivationUrl(userId: string): Promise<string> {
  const appUrl = process.env.APP_URL;
  if (!appUrl) throw new Error('APP_URL is not defined');
  const token = crypto.randomBytes(32).toString('hex');

  const hmac = crypto.createHmac('sha256', process.env.ACTIVATION_SECRET);
  hmac.update(token);
  const tokenHash = hmac.digest('hex');

  const expiration = 24 * 60 * 60; // 24 hours
  await redis.set(tokenHash, userId, expiration);
  return `${appUrl}/activate?token=${token}`;
}

async function activateUser(token: string): Promise<UserResult> {
  const hmac = crypto.createHmac('sha256', process.env.ACTIVATION_SECRET);
  hmac.update(token);
  const tokenHash = hmac.digest('hex');

  const userId = await redis.get(tokenHash);
  if (!userId) return { success: false };
  await query('UPDATE users SET is_active = TRUE WHERE id = $1', [userId]);
  await redis.del(tokenHash);
  return { success: true };
}

async function deleteUser(userId: string): Promise<void> {
  await query('DELETE FROM users WHERE id = $1', [userId]);
}
