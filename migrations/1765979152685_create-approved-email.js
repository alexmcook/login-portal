/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable('approved_email', {
    email: { type: 'text', primaryKey: true, notNull: true },
    approved_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  })

  pgm.addConstraint('approved_email', 'approved_email_email_unique', {
    unique: ['email'],
  })

  const approved = (process.env.APPROVED_EMAIL ?? '').split(';').map(s => s.trim().toLowerCase());
  if (approved.length) {
    const values = approved.map(email => `'${email}'`).join(', ');
    pgm.sql(`INSERT INTO approved_email (email) VALUES (${values})`);
  }
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('approved_email')
};
