import vine from '@vinejs/vine'

export const createProduitValidator = vine.compile(
  vine.object({
    nom: vine.string().trim().minLength(1),
    description: vine.string().trim().optional(),
    prix: vine.number().positive(),
    categorie: vine.enum(['plat', 'boisson', 'dessert', 'accompagnement']),
    active: vine.boolean().optional(),
  })
)

export const updateProduitValidator = vine.compile(
  vine.object({
    nom: vine.string().trim().minLength(1).optional(),
    description: vine.string().trim().optional(),
    prix: vine.number().positive().optional(),
    categorie: vine.enum(['plat', 'boisson', 'dessert', 'accompagnement']).optional(),
    active: vine.boolean().optional(),
  })
)
