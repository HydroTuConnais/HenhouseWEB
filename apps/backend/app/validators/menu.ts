import vine from '@vinejs/vine'

export const createMenuValidator = vine.compile(
  vine.object({
    nom: vine.string().minLength(2).maxLength(100),
    description: vine.string().optional(),
    prix: vine.number().positive(), // Corrigé de "price" vers "prix"
    active: vine.boolean().optional(), // Corrigé de "actif" vers "active"
    imageUrl: vine.string().optional(), // nom du fichier seulement
    imagePath: vine.string().optional(), // chemin complet
    entrepriseIds: vine
      .any()
      .transform((value) => {
        if (Array.isArray(value)) return value

        if (typeof value === 'string') {
          try {
            return JSON.parse(value)
          } catch (e) {
            if (value.includes(',')) {
              return value.split(',').map((v) => Number(v.trim()))
            }
          }
        }

        return undefined
      })
      .optional(),
  })
)

export const updateMenuValidator = vine.compile(
  vine.object({
    nom: vine.string().minLength(2).maxLength(100).optional(),
    description: vine.string().optional(),
    prix: vine.number().positive().optional(),
    active: vine.boolean().optional(),
    imageUrl: vine.string().optional(),
    imagePath: vine.string().optional(),
    entrepriseIds: vine
      .any()
      .transform((value) => {
        if (Array.isArray(value)) return value

        if (typeof value === 'string') {
          try {
            return JSON.parse(value)
          } catch (e) {
            if (value.includes(',')) {
              return value.split(',').map((v) => Number(v.trim()))
            }
          }
        }

        return undefined
      })
      .optional(),
  })
)
