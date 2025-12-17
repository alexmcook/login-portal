import { type UserRepo } from '../repositories/user.js'

export type HashProvider = {
  hash: (password: string, options?: { timeCost?: number }) => Promise<string>
  verify: (hash: string, password: string) => Promise<boolean>
}

export type AuthService = {
  registerUser(email: string, password: string): Promise<{ ok: boolean; activationUrl?: string; code?: number; message?: string }>
  activateUser(token: string): Promise<{ ok: boolean; code?: number; message?: string }>
  verifyUser(email: string, password: string): Promise<{ ok: boolean; userId: string, code?: number; message?: string }>
  deactivateUser(userId: string, password: string): Promise<{ ok: boolean; code?: number; message?: string }>
  resetPassword(userId: string, newPassword: string): Promise<{ ok: boolean; code?: number; message?: string }>
}

export function setupAuth(userRepo: UserRepo, hashProvider: HashProvider): AuthService {
  return {
    registerUser: (email: string, password: string) => registerUser(userRepo, hashProvider, email, password),
    activateUser: (token: string) => activateUser(userRepo, token),
    verifyUser: (email: string, password: string) => verifyUser(userRepo, hashProvider, email, password),
    deactivateUser: (userId: string, email: string) => deactivateUser(userRepo, hashProvider, userId, email),
    resetPassword: (userId: string, newPassword: string) => resetPassword(userRepo, hashProvider, userId, newPassword)
  }
}

async function registerUser(userRepo: UserRepo, hashProvider: HashProvider, email: string, password: string) {
  const hashedPassword = await hashProvider.hash(password, { timeCost: 3 });
  const result = await userRepo.createUser(email, hashedPassword);
  if (!result.success) return { ok: false, code: 500, message: 'email already registered' };
  const activationUrl = await userRepo.createActivationUrl(result.user.id);
  return { ok: true, userId: result.user.id, activationUrl: activationUrl };
}

async function activateUser(userRepo: UserRepo, token: string) {
  const result = await userRepo.activateUser(token);
  if (!result.success) return { ok: false, code: 400, message: 'invalid or expired activation link' };
  return { ok: true };
}

async function verifyUser(userRepo: UserRepo, hashProvider: HashProvider, email: string, password: string) {
  const result = await userRepo.findByEmail(email);
  if (!result.success) return { ok: false, code: 401, message: 'invalid credentials' };
  const valid = await hashProvider.verify(result.user!.password_hash!, password);
  if (!valid) return { ok: false, code: 401, message: 'invalid credentials' };
  const activated = result.user!.is_active!;
  if (!activated) return { ok: false, code: 403, message: 'account not activated' };
  return { ok: true, userId: result.user!.id! };
}

async function deactivateUser(userRepo: UserRepo, hashProvider: HashProvider, userId: string, password: string) {
  const userResult = await userRepo.findById(id);
  if (!userResult.success) return { ok: false, code: 404, message: 'user not found' };
  const verifyResult = await verifyUser(userRepo, hashProvider, userResult.user!.email!, password);
  if (!verifyResult.ok) return { ok: false, code: verifyResult.code, message: verifyResult.message };
  await userRepo.deleteUser(userId);
  return { ok: true };
}

async function resetPassword(userRepo: UserRepo, hashProvider: HashProvider, userId: string, newPassword: string) {
  const userResult = await userRepo.findById(userId);
  if (!userResult.success) return { ok: false, code: 404, message: 'user not found' };
  const hashedPassword = await hashProvider.hash(newPassword, { timeCost: 3 });
  const updateResult = await userRepo.updatePassword(userResult.user!.id!, hashedPassword);
  if (!updateResult.success) return { ok: false, code: 500, message: 'failed to update password' };
  return { ok: true };
}
