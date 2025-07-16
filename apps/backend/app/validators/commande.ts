import vine from '@vinejs/vine'

export const createCommandeValidator = vine.compile(
  vine.object({
    // Ancien format (optionnel pour compatibilité)
    produits: vine
      .array(
        vine.object({
          produit_id: vine.number(),
          quantite: vine.number().positive(),
        })
      )
      .minLength(1)
      .optional(),
    
    // Nouveau format (optionnel pour compatibilité)
    items: vine
      .array(
        vine.object({
          type: vine.enum(['menu', 'produit']),
          itemId: vine.number(),
          quantite: vine.number().positive(),
        })
      )
      .minLength(1)
      .optional(),
    
    telephone_livraison: vine.string().minLength(8).maxLength(8),
    creneaux_livraison: vine.array(
      vine.object({
        jour_debut: vine.string(),
        heure_debut: vine.string(),
        jour_fin: vine.string(),
        heure_fin: vine.string(),
      })
    ).optional(),
    notes_commande: vine.string().optional(),
    entreprise_id: vine.number().optional(),
    type_livraison: vine.enum(['livraison', 'click_and_collect']).optional(),
  })
)
