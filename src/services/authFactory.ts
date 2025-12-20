import * as argon2 from 'argon2';
import { userRepo } from '../repositories/user.js'
import * as auth from '../services/auth.js'

export { registerUser, activateUser, verifyUser, deactivateUser, updatePassword }

const hashProvider: auth.HashProvider = {
  hash: async (password: string, options?: { timeCost?: number }) => {
    const timeCost = options?.timeCost ?? 3;
    return await argon2.hash(password, { timeCost });
  },
  verify: async (hash: string, password: string) => {
    return await argon2.verify(hash, password);
  }
};

function registerUser(email: string, password: string): Promise<string> {
  return auth.registerUser(userRepo, hashProvider, email, password);
}

function activateUser(token: string): Promise<string> {
  return auth.activateUser(userRepo, token);
}

function verifyUser(email: string, password: string): Promise<string> {
  return auth.verifyUser(userRepo, hashProvider, email, password);
}

const deactivateUser = (userId: string, password: string): Promise<string> => {
  return auth.deactivateUser(userRepo, hashProvider, userId, password);
};

const updatePassword = (userId: string, newPassword: string): Promise<string> => {
  return auth.updatePassword(userRepo, hashProvider, userId, newPassword);
};
