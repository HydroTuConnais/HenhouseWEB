import vine from '@vinejs/vine'

export const createProduitValidator = vine.compile(
  vine.object({
    nom: vine.string().minLength(2).maxLength(100),
    description: vine.string().optional(),
    prix: vine.number().positive(),
    categorie: vine.string().optional(),
    stock: vine.number().min(0).optional(),
    actif: vine.boolean().optional(),
    image: vine
      .file({
        size: '5mb',
        extnames: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      })
      .optional(),
  })
)

export const updateProduitValidator = vine.compile(
  vine.object({
    nom: vine.string().minLength(2).maxLength(100).optional(),
    description: vine.string().optional(),
    prix: vine.number().positive().optional(),
    categorie: vine.string().optional(),
    stock: vine.number().min(0).optional(),
    actif: vine.boolean().optional(),
    image: vine
      .file({
        size: '5mb',
        extnames: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      })
      .optional(),
  })
)
