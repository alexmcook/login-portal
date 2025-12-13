import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupAuth } from '../src/services/auth.ts'

describe('registerUser', () => {
	beforeEach(() => { vi.resetAllMocks() });

	it('hashes the password, inserts the user and returns the created row', async () => {
    const mockUserRepo = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      createUser: vi.fn()
    };

		const mockHashProvider = {
			hash: vi.fn(),
			verify: vi.fn()
		};

		mockUserRepo.createUser.mockResolvedValue({ created: true, user: { id: 1, email: 'test@example.com' }});
    mockHashProvider.hash.mockResolvedValue('hashed-password');

		const auth = setupAuth(mockUserRepo, mockHashProvider);

		const res = await auth.registerUser('test@example.com', 'secret');

		expect(res.ok).toBe(true);
		expect(res.userId).toBe(1);
		expect(mockHashProvider.hash).toHaveBeenCalledWith('secret', { timeCost: 3 });
		expect(mockUserRepo.createUser).toHaveBeenCalledWith('test@example.com', 'hashed-password');
	});
});