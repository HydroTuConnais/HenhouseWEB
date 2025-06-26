import vine from '@vinejs/vine'

export const createEntrepriseValidator = vine.compile(
  vine.object({
    nom: vine.string().minLength(2).maxLength(100),
  })
)

export const updateEntrepriseValidator = vine.compile(
  vine.object({
    nom: vine.string().minLength(2).maxLength(100).optional(),
  })
)

export const createProduitValidator = vine.compile(
  vine.object({
    nom: vine.string().trim().minLength(1).maxLength(255),
    description: vine.string().trim().optional(),
    prix: vine.number().positive(),
    categorie: vine.enum(['plat', 'boisson', 'dessert', 'accompagnement']),
    active: vine.boolean().optional(),
    imageUrl: vine.string().url().optional(),
    imagePath: vine.string().optional(),
    entrepriseIds: vine.array(vine.number()).optional(),
  })
)

export const updateProduitValidator = vine.compile(
  vine.object({
    nom: vine.string().trim().minLength(1).maxLength(255).optional(),
    description: vine.string().trim().optional(),
    prix: vine.number().positive().optional(),
    categorie: vine.enum(['plat', 'boisson', 'dessert', 'accompagnement']).optional(),
    active: vine.boolean().optional(),
    imageUrl: vine.string().url().optional(),
    imagePath: vine.string().optional(),
    entrepriseIds: vine.array(vine.number()).optional(),
  })
)
