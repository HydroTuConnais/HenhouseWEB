import vine from '@vinejs/vine'

export const createCommandeValidator = vine.compile(
  vine.object({
    produits: vine
      .array(
        vine.object({
          produit_id: vine.number(),
          quantite: vine.number().positive(),
        })
      )
      .minLength(1),
    telephone_livraison: vine.string().minLength(8).maxLength(8),
    creneaux_livraison: vine.array(
      vine.object({
        jour_debut: vine.string(),
        heure_debut: vine.string(),
        jour_fin: vine.string(),
        heure_fin: vine.string(),
      })
    ).minLength(1),
    notes_commande: vine.string().optional(),
    entreprise_id: vine.number(),
  })
)
