import * as argon2 from 'argon2';
import { userRepo } from '../repositories/user.js'
import { setupAuth, type AuthService } from '../services/auth.js'

export { type AuthService } from '../services/auth.js'

export const auth: AuthService = {
  registerUser: (email: string, password: string) => registerUser(userRepo, hashProvider, email, password),
  activateUser: (token: string) => activateUser(userRepo, token),
  verifyUser: (email: string, password: string) => verifyUser(userRepo, hashProvider, email, password),
  deactivateUser: (userId: string, password: string) => deactivateUser(userRepo, hashProvider, userId, password),
  updatePassword: (userId: string, newPassword: string) => updatePassword(userRepo, hashProvider, userId, newPassword)
}
