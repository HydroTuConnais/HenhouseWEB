import vine from '@vinejs/vine'

export const createMenuValidator = vine.compile(
  vine.object({
    nom: vine.string().trim().minLength(2),
    description: vine.string().optional(),
    prix: vine.number().positive()
  })
)

export const updateMenuValidator = vine.compile(
  vine.object({
    nom: vine.string().trim().minLength(2).optional(),
    description: vine.string().optional(),
    prix: vine.number().positive().optional(),
    active: vine.boolean().optional()
  })
)