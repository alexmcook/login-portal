import { type UserRepo } from '../repositories/user.js'
import { redis } from '../services/redis.js';
import crypto from 'crypto';
import { config } from '../config.js';

export type HashProvider = {
  hash: (password: string, options?: { timeCost?: number }) => Promise<string>
  verify: (hash: string, password: string) => Promise<boolean>
}

export function setupAuth(userRepo: UserRepo, hashProvider: HashProvider): AuthService {
  return {
    registerUser: (email: string, password: string) => registerUser(userRepo, hashProvider, email, password),
    activateUser: (token: string) => activateUser(userRepo, token),
    verifyUser: (email: string, password: string) => verifyUser(userRepo, hashProvider, email, password),
    deactivateUser: (userId: string, password: string) => deactivateUser(userRepo, hashProvider, userId, password),
    updatePassword: (userId: string, newPassword: string) => updatePassword(userRepo, hashProvider, userId, newPassword)
  }
}

export async function registerUser(userRepo: UserRepo, hashProvider: HashProvider, email: string, password: string) {
  const hashedPassword = await hashProvider.hash(password, { timeCost: 3 });
  const result = await userRepo.createUser(email, hashedPassword);
  if (!result.success) return { ok: false, code: 500, message: 'email already registered' };
  const activationUrl = await userRepo.createActivationUrl(result.user!.id);
  return { ok: true, userId: result.user!.id, activationUrl: activationUrl };
}

export async function activateUser(userRepo: UserRepo, token: string) {
  const result = await userRepo.activateUser(token);
  if (!result.success) return { ok: false, code: 400, message: 'invalid or expired activation link' };
  return { ok: true };
}

export async function verifyUser(userRepo: UserRepo, hashProvider: HashProvider, email: string, password: string) {
  const result = await userRepo.findByEmail(email);
  if (!result.success) return { ok: false, code: 401, message: 'invalid credentials' };
  const valid = await hashProvider.verify(result.user!.password_hash!, password);
  if (!valid) return { ok: false, code: 401, message: 'invalid credentials' };
  const activated = result.user!.is_active!;
  if (!activated) return { ok: false, code: 403, message: 'account not activated' };
  return { ok: true, userId: result.user!.id! };
}

export async function deactivateUser(userRepo: UserRepo, hashProvider: HashProvider, userId: string, password: string) {
  const result = await userRepo.findById(userId);
  if (!result.success) return { ok: false, code: 404, message: 'user not found' };
  const valid = await hashProvider.verify(result.user!.password_hash!, password);
  if (!valid) return { ok: false, code: 401, message: 'invalid credentials' };
  await userRepo.deleteUser(userId);
  return { ok: true };
}

export async function updatePassword(userRepo: UserRepo, hashProvider: HashProvider, token: string, newPassword: string) {
  const hmac = crypto.createHmac('sha256', String(config.PASSWORD_RESET_SECRET));
  hmac.update(token);
  const tokenHash = hmac.digest('hex');

  const userId = await redis.get(tokenHash);
  if (!userId) return { ok: false, code: 400, message: 'invalid or expired password reset link' };
  const hashedPassword = await hashProvider.hash(newPassword, { timeCost: 3 });
  await userRepo.updatePassword(userId, hashedPassword);
  await redis.del(tokenHash);
  return { ok: true };
}
