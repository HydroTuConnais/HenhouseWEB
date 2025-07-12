import vine from '@vinejs/vine'

export const createProduitValidator = vine.compile(
  vine.object({
    nom: vine.string().trim().minLength(1),
    description: vine.string().trim().optional(),
    prix: vine.number().positive(),
    categories: vine.string().optional(), // Changé de categorie à categories pour être cohérent
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

export const updateProduitValidator = vine.compile(
  vine.object({
    nom: vine.string().trim().minLength(1).optional(),
    description: vine.string().trim().optional(),
    prix: vine.number().positive().optional(),
    categories: vine.string().optional(),
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
