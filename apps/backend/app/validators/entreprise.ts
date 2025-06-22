import vine from '@vinejs/vine'

export const createEntrepriseValidator = vine.compile(
  vine.object({
    nom: vine.string().minLength(2).maxLength(100)
  })
)

export const updateEntrepriseValidator = vine.compile(
  vine.object({
    nom: vine.string().minLength(2).maxLength(100).optional()
  })
)