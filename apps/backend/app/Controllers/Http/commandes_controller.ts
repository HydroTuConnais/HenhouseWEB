import type { HttpContext } from '@adonisjs/core/http'
import Commande from '#models/commande'
import Produit from '#models/produit'
import { createCommandeValidator } from '#validators/commande'

export default class CommandesController {
  async index({ auth, response }: HttpContext) {
    const user = auth.user!

    let commandes
    if (user.role === 'admin') {
      commandes = await Commande.query()
        .preload('user')
        .preload('entreprise')
        .preload('produits')
        .orderBy('created_at', 'desc')
    } else {
      commandes = await Commande.query()
        .where('entreprise_id', user.entrepriseId!)
        .preload('user')
        .preload('produits')
        .orderBy('created_at', 'desc')
    }

    return response.ok({ commandes })
  }

  async show({ params, auth, response }: HttpContext) {
    const user = auth.user!
    const commandeId = params.id

    let commande
    if (user.role === 'admin') {
      commande = await Commande.query()
        .where('id', commandeId)
        .preload('user')
        .preload('entreprise')
        .preload('produits')
        .first()
    } else {
      commande = await Commande.query()
        .where('id', commandeId)
        .where('entreprise_id', user.entrepriseId!)
        .preload('user')
        .preload('produits')
        .first()
    }

    if (!commande) {
      return response.notFound({ message: 'Commande non trouvée' })
    }

    return response.ok({ commande })
  }

  async store({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(createCommandeValidator)

    // Vérifier que les produits existent et appartiennent aux menus de l'entreprise
    const produits = await Produit.query()
      .whereIn(
        'id',
        payload.produits.map((p: { produit_id: number }) => p.produit_id)
      )
      .whereHas('menu', (menuQuery) => {
        menuQuery.whereHas('entreprises', (entQuery) => {
          entQuery.where('entreprise_id', user.entrepriseId!)
        })
      })
      .preload('menu')

    if (produits.length !== payload.produits.length) {
      return response.badRequest({ message: 'Certains produits ne sont pas disponibles' })
    }

    // Calculer le total
    let total = 0
    const produitsAvecQuantite = payload.produits.map(
      (p: { produit_id: number; quantite: number }) => {
        const produit = produits.find((prod) => prod.id === p.produit_id)!
        const sousTotal = produit.prix * p.quantite
        total += sousTotal
        return {
          ...p,
          prix_unitaire: produit.prix,
        }
      }
    )

    // Créer la commande
    const commande = await Commande.create({
      userId: user.id,
      entrepriseId: user.entrepriseId!,
      total,
    })

    // Attacher les produits
    for (const item of produitsAvecQuantite) {
      await commande.related('produits').attach({
        [item.produit_id]: {
          quantite: item.quantite,
          prix_unitaire: item.prix_unitaire,
        },
      })
    }

    await commande.load('produits')

    return response.created({
      message: 'Commande créée avec succès',
      commande,
    })
  }

  async updateStatut({ params, request, response, auth }: HttpContext) {
    const user = auth.user!
    const { statut } = request.only(['statut'])

    let commande
    if (user.role === 'admin') {
      commande = await Commande.findOrFail(params.id)
    } else {
      commande = await Commande.query()
        .where('id', params.id)
        .where('entreprise_id', user.entrepriseId!)
        .firstOrFail()
    }

    commande.statut = statut
    await commande.save()

    return response.ok({
      message: 'Statut de la commande mis à jour',
      commande,
    })
  }
}
