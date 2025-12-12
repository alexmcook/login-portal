import * as argon2 from 'argon2'
import { pool } from './db.js'

export async function createUser(email: string, password: string) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email])
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK')
      return { ok: false, code: 409, message: 'email already exists' }
    }

    const hash = await argon2.hash(password, { timeCost: 3 })
    const res = await client.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [email, hash]
    )
    await client.query('COMMIT')
    return { ok: true, user: res.rows[0] }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw err
  } finally {
    client.release()
  }
}

export async function verifyUser(email: string, password: string) {
  const res = await pool.query('SELECT id, password_hash FROM users WHERE email = $1', [email])
  if (res.rowCount === 0) return { ok: false, code: 401, message: 'invalid credentials' }
  const user = res.rows[0]

  const valid = await argon2.verify(user.password_hash, password)
  if (!valid) return { ok: false, code: 401, message: 'invalid credentials' }

  // update last_login
  await pool.query('UPDATE users SET last_login = now() WHERE id = $1', [user.id])
  return { ok: true, userId: user.id }
}
