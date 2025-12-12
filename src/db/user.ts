import { query, transaction } from './db.js'

export type UserRow = { id: number; email: string; password_hash: string };

export type UserRepo = {
    findByEmail(email: string): Promise<UserRow | null>
    createUser(email: string, passwordHash: string): Promise<UserRow | null>
};

export const userRepo: UserRepo = {
    findByEmail,
    createUser
}

async function findByEmail(email: string): Promise<UserRow | null> {
    const result = await query('SELECT id, email, password_hash FROM users WHERE email = $1', [email]);
    return result.rows[0] as UserRow ?? null;
}

async function createUser(email: string, passwordHash: string): Promise<UserRow | null> {
    const result = await query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING RETURNING id, email, password_hash',
        [email, passwordHash]
    );
    return result.rows[0] as UserRow ?? null;
}