import vine from '@vinejs/vine'

export const createCommandeValidator = vine.compile(
  vine.object({
    produits: vine.array(
      vine.object({
        produit_id: vine.number(),
        quantite: vine.number().positive()
      })
    ).minLength(1)
  })
)