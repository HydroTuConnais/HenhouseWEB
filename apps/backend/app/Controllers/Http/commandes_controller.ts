import type { HttpContext } from '@adonisjs/core/http'
import Commande from '#models/commande'
import Produit from '#models/produit'
import Entreprise from '#models/entreprise'
import { createCommandeValidator } from '#validators/commande'
import Database from '@adonisjs/lucid/services/db'

export default class CommandesController {
  async index({ auth, response }: HttpContext) {
    const user = auth.user!

    let commandes
    if (user.role === 'admin') {
      commandes = await Commande.query()
        .preload('user')
        .preload('entreprise')
        .preload('produits', (produitQuery) => {
          produitQuery.pivotColumns(['quantite', 'prix_unitaire'])
        })
        .orderBy('created_at', 'desc')
    } else {
      commandes = await Commande.query()
        .where('entreprise_id', user.entrepriseId!)
        .preload('user')
        .preload('produits', (produitQuery) => {
          produitQuery.pivotColumns(['quantite', 'prix_unitaire'])
        })
        .orderBy('created_at', 'desc')
    }

    // Transformer les données pour inclure les informations pivot correctement
    const commandesWithPivot = await Promise.all(commandes.map(async commande => {
      const commandeObj = commande.serialize()
      
      if (commandeObj.produits && commandeObj.produits.length > 0) {
        // Récupérer les données pivot directement depuis la base de données
        const pivotData = await Database.from('commande_produits')
          .where('commande_id', commande.id)
          .select('produit_id', 'quantite', 'prix_unitaire')
        
        commandeObj.produits = commandeObj.produits.map((produit: any) => {
          const pivot = pivotData.find((p: any) => p.produit_id === produit.id)
          
          if (pivot) {
            produit.pivot = {
              quantite: pivot.quantite,
              prix_unitaire: pivot.prix_unitaire
            }
          } else {
            produit.pivot = {
              quantite: 1,
              prix_unitaire: produit.prix
            }
          }
          
          // Supprimer $extras si présent
          delete produit.$extras
          
          return produit
        })
      }
      
      return commandeObj
    }))

    return response.ok({ commandes: commandesWithPivot })
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
        .preload('produits', (produitQuery) => {
          produitQuery.pivotColumns(['quantite', 'prix_unitaire'])
        })
        .first()
    } else {
      commande = await Commande.query()
        .where('id', commandeId)
        .where('entreprise_id', user.entrepriseId!)
        .preload('user')
        .preload('produits', (produitQuery) => {
          produitQuery.pivotColumns(['quantite', 'prix_unitaire'])
        })
        .first()
    }

    if (!commande) {
      return response.notFound({ message: 'Commande non trouvée' })
    }

    // Transformer les données pour inclure les informations pivot correctement
    const commandeObj = commande.serialize()
    
    if (commandeObj.produits && commandeObj.produits.length > 0) {
      // Récupérer les données pivot directement depuis la base de données
      const pivotData = await Database.from('commande_produits')
        .where('commande_id', commande.id)
        .select('produit_id', 'quantite', 'prix_unitaire')
      
      commandeObj.produits = commandeObj.produits.map((produit: any) => {
        const pivot = pivotData.find((p: any) => p.produit_id === produit.id)
        
        if (pivot) {
          produit.pivot = {
            quantite: pivot.quantite,
            prix_unitaire: pivot.prix_unitaire
          }
        } else {
          produit.pivot = {
            quantite: 1,
            prix_unitaire: produit.prix
          }
        }
        
        // Supprimer $extras si présent
        delete produit.$extras
        
        return produit
      })
    }

    return response.ok({ commande: commandeObj })
  }

  async store({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(createCommandeValidator)

    // Vérifier que les produits existent et sont actifs
    const produits = await Produit.query()
      .whereIn(
        'id',
        payload.produits.map((p: { produit_id: number }) => p.produit_id)
      )
      .where('active', true)

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
      entrepriseId: payload.entreprise_id,
      total,
      telephoneLivraison: payload.telephone_livraison,
      creneauxLivraison: JSON.stringify(payload.creneaux_livraison),
      notesCommande: payload.notes_commande,
      statut: 'en_attente',
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

    await commande.load('produits', (produitQuery) => {
      produitQuery.pivotColumns(['quantite', 'prix_unitaire'])
    })

    // Transformer les données pour inclure les informations pivot correctement
    const commandeObj = commande.serialize()
    
    if (commandeObj.produits && commandeObj.produits.length > 0) {
      // Récupérer les données pivot directement depuis la base de données
      const pivotData = await Database.from('commande_produits')
        .where('commande_id', commande.id)
        .select('produit_id', 'quantite', 'prix_unitaire')
      
      commandeObj.produits = commandeObj.produits.map((produit: any) => {
        const pivot = pivotData.find((p: any) => p.produit_id === produit.id)
        
        if (pivot) {
          produit.pivot = {
            quantite: pivot.quantite,
            prix_unitaire: pivot.prix_unitaire
          }
        } else {
          produit.pivot = {
            quantite: 1,
            prix_unitaire: produit.prix
          }
        }
        
        // Supprimer $extras si présent
        delete produit.$extras
        
        return produit
      })
    }

    return response.created({
      message: 'Commande créée avec succès',
      commande: commandeObj,
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

  // ===== MÉTHODES PUBLIQUES (SANS AUTHENTIFICATION) =====

  /**
   * Récupère les entreprises avec leurs menus disponibles pour commander
   */
  async getEntreprisesPublic({ response }: HttpContext) {
    const entreprises = await Entreprise.query()
      .preload('menus', (menuQuery) => {
        menuQuery
          .where('active', true)
          .preload('produits', (produitQuery) => {
            produitQuery.where('active', true)
          })
      })

    return response.ok({ entreprises })
  }

  /**
   * Récupère une entreprise avec ses menus pour commander
   */
  async getEntreprisePublic({ params, response }: HttpContext) {
    const entreprise = await Entreprise.query()
      .where('id', params.id)
      .preload('menus', (menuQuery) => {
        menuQuery
          .where('active', true)
          .preload('produits', (produitQuery) => {
            produitQuery.where('active', true)
          })
      })
      .first()

    if (!entreprise) {
      return response.notFound({ message: 'Entreprise non trouvée' })
    }

    return response.ok({ entreprise })
  }

  /**
   * Crée une commande publique (sans authentification)
   */
  async storePublic({ request, response }: HttpContext) {
    const payload = await request.validateUsing(createCommandeValidator)

    // Vérifier que l'entreprise existe
    const entreprise = await Entreprise.query()
      .where('id', payload.entreprise_id)
      .first()

    if (!entreprise) {
      return response.badRequest({ message: 'Entreprise non trouvée' })
    }

    // Vérifier que les produits existent et sont actifs
    const produitIds = payload.produits.map((p: { produit_id: number }) => p.produit_id)
    const produits = await Produit.query()
      .whereIn('id', produitIds)
      .where('active', true)

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
      entrepriseId: payload.entreprise_id,
      total,
      telephoneLivraison: payload.telephone_livraison,
      creneauxLivraison: JSON.stringify(payload.creneaux_livraison),
      notesCommande: payload.notes_commande,
      statut: 'en_attente',
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
    await commande.load('entreprise')

    return response.created({
      message: 'Commande créée avec succès',
      commande,
      numeroCommande: commande.numeroCommande,
    })
  }

  /**
   * Récupère le statut d'une commande publique par son numéro
   */
  async getStatutPublic({ params, response }: HttpContext) {
    const commande = await Commande.query()
      .where('numero_commande', params.numero)
      .preload('entreprise')
      .preload('produits')
      .first()

    if (!commande) {
      return response.notFound({ message: 'Commande non trouvée' })
    }

    // Parser les créneaux de livraison
    const creneaux = commande.creneauxLivraison ? JSON.parse(commande.creneauxLivraison) : []

    return response.ok({ 
      commande: {
        ...commande.serialize(),
        creneaux_livraison: creneaux
      }
    })
  }
}
