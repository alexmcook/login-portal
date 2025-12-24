import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupAuth } from '../src/services/auth.ts'
import { redis } from '../src/services/redis'

describe('auth service', () => {
	beforeEach(() => { vi.resetAllMocks() });

	it('registers a new user: hashes password, inserts user and returns created row', async () => {
		const mockUserRepo = {
			findById: vi.fn(),
			findByEmail: vi.fn(),
			createUser: vi.fn(),
			setLastLogin: vi.fn(),
			createActivationUrl: vi.fn(),
			activateUser: vi.fn(),
			deleteUser: vi.fn(),
			createPasswordResetUrl: vi.fn(),
			updatePassword: vi.fn()
		};

		const mockHashProvider = {
			hash: vi.fn(),
			verify: vi.fn()
		};

		mockUserRepo.createUser.mockResolvedValue({ success: true, user: { id: 1, email: 'test@example.com' }});
		mockHashProvider.hash.mockResolvedValue('hashed-password');

		const auth = setupAuth(mockUserRepo, mockHashProvider);

		const res = await auth.registerUser('test@example.com', 'secret');

		expect(res.ok).toBe(true);
		expect(res.userId).toBe(1);
		expect(mockHashProvider.hash).toHaveBeenCalledWith('secret', { timeCost: 3 });
		expect(mockUserRepo.createUser).toHaveBeenCalledWith('test@example.com', 'hashed-password');
	});

	it('returns error when email already registered', async () => {
		const mockUserRepo = { createUser: vi.fn() } as any;
		const mockHashProvider = { hash: vi.fn(), verify: vi.fn() } as any;

		mockUserRepo.createUser.mockResolvedValue({ success: false });
		mockHashProvider.hash.mockResolvedValue('ignored');

		const auth = setupAuth(mockUserRepo, mockHashProvider);
		const res = await auth.registerUser('taken@example.com', 'pw');

		expect(res.ok).toBe(false);
		expect(res.message).toBe('email already registered');
		expect(mockHashProvider.hash).toHaveBeenCalled();
	});

	it('activates user successfully and returns error for invalid token', async () => {
		const mockUserRepo = { activateUser: vi.fn() } as any;
		mockUserRepo.activateUser.mockResolvedValueOnce({ success: true }).mockResolvedValueOnce({ success: false });

		const auth = setupAuth(mockUserRepo, {} as any);
		const okRes = await auth.activateUser('good-token');
		const badRes = await auth.activateUser('bad-token');

		expect(okRes.ok).toBe(true);
		expect(badRes.ok).toBe(false);
		expect(badRes.message).toBe('invalid or expired activation link');
	});

	it('verifies user credentials: success, invalid email, wrong password, and not activated', async () => {
		const mockUserRepo = { findByEmail: vi.fn() } as any;
		const mockHashProvider = { verify: vi.fn() } as any;

		// success
		mockUserRepo.findByEmail.mockResolvedValueOnce({ success: true, user: { id: 'u1', password_hash: 'h', is_active: true } });
		mockHashProvider.verify.mockResolvedValueOnce(true);
		const auth = setupAuth(mockUserRepo, mockHashProvider);
		let res = await auth.verifyUser('a@b.com', 'pw');
		expect(res.ok).toBe(true);
		expect(res.userId).toBe('u1');

		// invalid email
		mockUserRepo.findByEmail.mockResolvedValueOnce({ success: false });
		res = await auth.verifyUser('no@one.com', 'pw');
		expect(res.ok).toBe(false);
		expect(res.code).toBe(401);

		// wrong password
		mockUserRepo.findByEmail.mockResolvedValueOnce({ success: true, user: { id: 'u2', password_hash: 'h2', is_active: true } });
		mockHashProvider.verify.mockResolvedValueOnce(false);
		res = await auth.verifyUser('a@b.com', 'bad');
		expect(res.ok).toBe(false);
		expect(res.code).toBe(401);

		// not activated
		mockUserRepo.findByEmail.mockResolvedValueOnce({ success: true, user: { id: 'u3', password_hash: 'h3', is_active: false } });
		mockHashProvider.verify.mockResolvedValueOnce(true);
		res = await auth.verifyUser('a@b.com', 'pw');
		expect(res.ok).toBe(false);
		expect(res.code).toBe(403);
	});

	it('deactivates user: success, not found, invalid password', async () => {
		const mockUserRepo = { findById: vi.fn(), deleteUser: vi.fn() } as any;
		const mockHashProvider = { verify: vi.fn() } as any;
		const auth = setupAuth(mockUserRepo, mockHashProvider);

		// success
		mockUserRepo.findById.mockResolvedValueOnce({ success: true, user: { id: 'u1', password_hash: 'h' } });
		mockHashProvider.verify.mockResolvedValueOnce(true);
		let res = await auth.deactivateUser('u1', 'pw');
		expect(res.ok).toBe(true);
		expect(mockUserRepo.deleteUser).toHaveBeenCalledWith('u1');

		// not found
		mockUserRepo.findById.mockResolvedValueOnce({ success: false });
		res = await auth.deactivateUser('nope', 'pw');
		expect(res.ok).toBe(false);
		expect(res.code).toBe(404);

		// invalid password
		mockUserRepo.findById.mockResolvedValueOnce({ success: true, user: { id: 'u2', password_hash: 'h2' } });
		mockHashProvider.verify.mockResolvedValueOnce(false);
		res = await auth.deactivateUser('u2', 'bad');
		expect(res.ok).toBe(false);
		expect(res.code).toBe(401);
	});

	it('updates password using token: fails on missing token and succeeds when redis has mapping', async () => {
		const mockUserRepo = { updatePassword: vi.fn() } as any;
		const mockHashProvider = { hash: vi.fn() } as any;
		const auth = setupAuth(mockUserRepo, mockHashProvider);

		// missing token
		vi.spyOn(redis, 'get').mockResolvedValueOnce(null as any);
		let res = await auth.updatePassword('bad-token', 'newpass');
		expect(res.ok).toBe(false);
		expect(res.code).toBe(400);
		expect(mockHashProvider.hash).not.toHaveBeenCalled();

		// success path
		vi.spyOn(redis, 'get').mockResolvedValueOnce('uid-123');
		vi.spyOn(redis, 'del').mockResolvedValueOnce(undefined as any);
		mockHashProvider.hash.mockResolvedValueOnce('new-hash');

		res = await auth.updatePassword('good-token', 'newpass');
		expect(res.ok).toBe(true);
		expect(mockUserRepo.updatePassword).toHaveBeenCalledWith('uid-123', 'new-hash');
		expect(redis.del).toHaveBeenCalled();
	});
});
