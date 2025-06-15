import vine from '@vinejs/vine'

export const registerValidator = vine.compile(
  vine.object({
    nom: vine.string().trim().minLength(2),
    prenom: vine.string().trim().minLength(2),
    email: vine.string().email().normalizeEmail(),
    password: vine.string().minLength(6),
    role: vine.enum(['entreprise', 'admin']),
    entrepriseId: vine.number().optional(),
  })
)

export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().email().normalizeEmail(),
    password: vine.string(),
  })
)
