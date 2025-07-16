import vine from '@vinejs/vine'

export const createUserValidator = vine.compile(
  vine.object({
    username: vine.string().trim().minLength(3).maxLength(50),
    password: vine.string().minLength(6),
    role: vine.enum(['admin', 'entreprise']),
    entrepriseId: vine.number().optional().nullable(),
  })
)

export const updateUserValidator = vine.compile(
  vine.object({
    username: vine.string().trim().minLength(3).maxLength(50).optional(),
    email: vine.string().email().normalizeEmail().optional(),
    password: vine.string().minLength(6).optional(),
    role: vine.enum(['admin', 'entreprise']).optional(),
    entrepriseId: vine.number().optional().nullable(),
  })
)
