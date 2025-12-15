export const up = (pgm) => {
  pgm.addColumn('users', {
    is_active: { type: 'boolean', notNull: true, default: false },
  })
}

export const down = (pgm) => {
  pgm.dropColumn('users', 'is_active')
}
