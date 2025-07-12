import vine from '@vinejs/vine'

export const createEntrepriseValidator = vine.compile(
  vine.object({
    nom: vine.string().minLength(2).maxLength(100),
    description: vine.string().optional(),
    adresse: vine.string().optional(),
    telephone: vine.string().optional(),
    email: vine.string().email().optional(),
    active: vine.boolean().optional(),
  })
)

export const updateEntrepriseValidator = vine.compile(
  vine.object({
    nom: vine.string().minLength(2).maxLength(100).optional(),
    description: vine.string().optional(),
    adresse: vine.string().optional(),
    telephone: vine.string().optional(),
    email: vine.string().email().optional(),
    active: vine.boolean().optional(),
  })
)
