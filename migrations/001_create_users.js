export const up = (pgm) => {
  pgm.createExtension('pgcrypto', { ifNotExists: true })

  pgm.createTable('users', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    email: { type: 'text', notNull: true },
    password_hash: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    last_login: { type: 'timestamptz' },
  })

  pgm.addConstraint('users', 'users_email_unique', {
    unique: ['email'],
  })
}

export const down = (pgm) => {
  pgm.dropTable('users')
}
