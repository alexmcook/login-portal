import { query, transaction } from './db.js'

export type UserResult = { created: boolean, user?: UserRow };
export type UserRow = { id?: string; email?: string; password_hash?: string };
export type UserRepo = {
    findByEmail(email: string): Promise<UserResult>
    createUser(email: string, passwordHash: string): Promise<UserResult>
};

export const userRepo: UserRepo = {
    findByEmail,
    createUser
}

async function findByEmail(email: string): Promise<UserResult> {
    const result = await query('SELECT id, email, password_hash FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return { created: false };
    return { created: true, user: result.rows[0] as UserRow };
}

async function createUser(email: string, passwordHash: string): Promise<UserResult> {
    const result = await query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING RETURNING id, email, password_hash',
        [email, passwordHash]
    );
    if (result.rows.length === 0) return { created: false };
    return { created: true, user: result.rows[0] as UserRow };
}