import vine from '@vinejs/vine'

export const registerValidator = vine.compile(
  vine.object({
    username: vine.string().trim().minLength(2),
    password: vine.string().minLength(6),
    role: vine.enum(['entreprise', 'admin']),
    entrepriseId: vine.number().optional(),
  })
)

export const loginValidator = vine.compile(
  vine.object({
    username: vine.string().trim().minLength(2),
    password: vine.string(),
  })
)
