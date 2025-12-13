import { type UserRepo } from './db/user.js'

export type HashProvider = {
  hash: (password: string, options?: { timeCost?: number }) => Promise<string>
  verify: (hash: string, password: string) => Promise<boolean>
}

export type AuthService = {
  registerUser(email: string, password: string): Promise<{ ok: boolean; userId?: string; code?: number; message?: string }>
  verifyUser(email: string, password: string): Promise<{ ok: boolean; userId?: string; code?: number; message?: string }>
}

export function setupAuth(userRepo: UserRepo, hashProvider: HashProvider): AuthService {
  return {
    registerUser: (email: string, password: string) => registerUser(userRepo, hashProvider, email, password),
    verifyUser: (email: string, password: string) => verifyUser(userRepo, hashProvider, email, password)
  }
}

async function registerUser(userRepo: UserRepo, hashProvider: HashProvider, email: string, password: string) {
    const hashedPassword = await hashProvider.hash(password, { timeCost: 3 });
    const result = await userRepo.createUser(email, hashedPassword);
    if (!result.success) return { ok: false, code: 500, message: 'email already registered' };
    return { ok: true, userId: result.user!.id! };
}

async function verifyUser(userRepo: UserRepo, hashProvider: HashProvider, email: string, password: string) {
    const result = await userRepo.findByEmail(email);
    if (!result.success) return { ok: false, code: 401, message: 'invalid credentials' };
    const valid = await hashProvider.verify(result.user!.password_hash!, password);
    if (!valid) return { ok: false, code: 401, message: 'invalid credentials' };
    return { ok: true, userId: result.user!.id! };
}
