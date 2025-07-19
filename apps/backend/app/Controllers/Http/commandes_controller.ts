import type { HttpContext } from '@adonisjs/core/http'
import Commande from '#models/commande'
import Produit from '#models/produit'
import Menu from '#models/menu'
import Entreprise from '#models/entreprise'
import User from '#models/user'
import { createCommandeValidator } from '#validators/commande'
import Database from '@adonisjs/lucid/services/db'
import DiscordService from '#services/discord_service'

export default class CommandesController {
  /**
   * Récupère les données formatées d'une commande pour Discord
   */
  private async getCommandeDiscordData(commandeId: number) {
    const commande = await Commande.findOrFail(commandeId)
    
    // Pour les commandes publiques, userId peut être null
    let user = null
    if (commande.userId) {
      user = await User.findOrFail(commande.userId)
    }
    
    const entreprise = commande.entrepriseId ? await Entreprise.findOrFail(commande.entrepriseId) : null
    
    // Récupérer les produits avec les données pivot
    const commandeProduits = await Database
      .from('commande_produits')
      .join('produits', 'commande_produits.produit_id', 'produits.id')
      .where('commande_produits.commande_id', commandeId)
      .select(
        'produits.nom',
        'commande_produits.quantite',
        'commande_produits.prix_unitaire'
      )

    // Récupérer les menus avec les données pivot
    const commandeMenus = await Database
      .from('commande_menus')
      .join('menus', 'commande_menus.menu_id', 'menus.id')
      .where('commande_menus.commande_id', commandeId)
      .select(
        'menus.nom',
        'commande_menus.quantite',
        'commande_menus.prix_unitaire'
      )

    // Combiner produits et menus pour Discord
    const tousLesItems = [
      ...commandeProduits.map((p: any) => ({
        nom: p.nom,
        quantite: p.quantite,
        prix_unitaire: p.prix_unitaire
      })),
      ...commandeMenus.map((m: any) => ({
        nom: m.nom,
        quantite: m.quantite,
        prix_unitaire: m.prix_unitaire
      }))
    ]

    return {
      id: commande.id,
      numero_commande: commande.numeroCommande,
      statut: commande.statut,
      total: commande.total,
      date_commande: commande.createdAt.toString(),
      creneaux_livraison: commande.creneauxLivraison,
      type_livraison: commande.typeLivraison,
      user: {
        email: user ? user.username : commande.telephoneLivraison || 'Client anonyme',
        prenom: undefined,
        nom: undefined
      },
      entreprise: {
        nom: entreprise ? entreprise.nom : 'Commande publique'
      },
      produits: tousLesItems
    }
  }
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
        .preload('menus', (menuQuery) => {
          menuQuery.pivotColumns(['quantite', 'prix_unitaire']).preload('produits')
        })
        .orderBy('created_at', 'desc')
    } else {
      commandes = await Commande.query()
        .where('entreprise_id', user.entrepriseId!)
        .preload('user')
        .preload('produits', (produitQuery) => {
          produitQuery.pivotColumns(['quantite', 'prix_unitaire'])
        })
        .preload('menus', (menuQuery) => {
          menuQuery.pivotColumns(['quantite', 'prix_unitaire']).preload('produits')
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
      
      // Traiter les menus de la même façon
      if (commandeObj.menus && commandeObj.menus.length > 0) {
        // Récupérer les données pivot des menus directement depuis la base de données
        const menusPivotData = await Database.from('commande_menus')
          .where('commande_id', commande.id)
          .select('menu_id', 'quantite', 'prix_unitaire')
        
        commandeObj.menus = commandeObj.menus.map((menu: any) => {
          const pivot = menusPivotData.find((p: any) => p.menu_id === menu.id)
          
          if (pivot) {
            menu.pivot = {
              quantite: pivot.quantite,
              prix_unitaire: pivot.prix_unitaire
            }
          } else {
            menu.pivot = {
              quantite: 1,
              prix_unitaire: menu.prix
            }
          }
          
          // Supprimer $extras si présent
          delete menu.$extras
          
          return menu
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
        .preload('menus', (menuQuery) => {
          menuQuery.pivotColumns(['quantite', 'prix_unitaire']).preload('produits')
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
        .preload('menus', (menuQuery) => {
          menuQuery.pivotColumns(['quantite', 'prix_unitaire']).preload('produits')
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
    
    // Traiter les menus de la même façon
    if (commandeObj.menus && commandeObj.menus.length > 0) {
      // Récupérer les données pivot des menus directement depuis la base de données
      const menusPivotData = await Database.from('commande_menus')
        .where('commande_id', commande.id)
        .select('menu_id', 'quantite', 'prix_unitaire')
      
      commandeObj.menus = commandeObj.menus.map((menu: any) => {
        const pivot = menusPivotData.find((p: any) => p.menu_id === menu.id)
        
        if (pivot) {
          menu.pivot = {
            quantite: pivot.quantite,
            prix_unitaire: pivot.prix_unitaire
          }
        } else {
          menu.pivot = {
            quantite: 1,
            prix_unitaire: menu.prix
          }
        }
        
        // Supprimer $extras si présent
        delete menu.$extras
        
        return menu
      })
    }

    return response.ok({ commande: commandeObj })
  }

  async store({ request, response, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(createCommandeValidator)

    // Validation personnalisée : au moins un des deux champs doit être présent
    if (!payload.produits && !(payload as any).items) {
      return response.badRequest({ 
        message: 'Au moins un des champs produits ou items doit être fourni' 
      })
    }

    // Pour l'instant, la méthode store ne gère que l'ancien format avec produits
    // Il faudrait l'adapter pour gérer aussi les items si nécessaire
    if (!payload.produits) {
      return response.badRequest({ 
        message: 'Cette méthode ne supporte que le format produits pour le moment' 
      })
    }

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
      creneauxLivraison: JSON.stringify(payload.creneaux_livraison || []),
      notesCommande: payload.notes_commande,
      statut: 'en_attente',
      typeLivraison: (payload as any).type_livraison || 'livraison',
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

    // Envoyer notification Discord
    try {
      const discordData = await this.getCommandeDiscordData(commande.id)
      await DiscordService.notifyNewCommande(discordData)
    } catch (error) {
      console.error('Erreur notification Discord:', error)
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

    // Note: Les notifications Discord sont gérées par les boutons Discord
    // Pas besoin de notifier ici pour éviter les doublons

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

    // Validation personnalisée : au moins un des deux champs doit être présent
    if (!payload.produits && !(payload as any).items) {
      return response.badRequest({ 
        message: 'Au moins un des champs produits ou items doit être fourni' 
      })
    }

    // Vérifier que l'entreprise existe (seulement si fournie)
    let entreprise = null
    if (payload.entreprise_id) {
      entreprise = await Entreprise.query()
        .where('id', payload.entreprise_id)
        .first()

      if (!entreprise) {
        return response.badRequest({ message: 'Entreprise non trouvée' })
      }
    }

    let total = 0
    const produitsAvecQuantite = []
    const menusAvecQuantite = []

    // Traiter les items (menus et produits)
    if ((payload as any).items && (payload as any).items.length > 0) {
      for (const item of (payload as any).items) {
        if (item.type === 'menu') {
          // Récupérer le menu directement (sans vérifier l'association entreprise pour les commandes publiques)
          const menu = await Menu.query()
            .where('id', item.itemId)
            .where('active', true)
            .first()
          
          console.log('DEBUG MENU TROUVE:', { item, menu, entrepriseId: payload.entreprise_id })
          if (menu) {
            const sousTotal = menu.prix * item.quantite
            total += sousTotal
            menusAvecQuantite.push({
              menuId: item.itemId,
              quantite: item.quantite,
              prix: menu.prix
            })
          }
        } else if (item.type === 'produit') {
          const produit = await Produit.query()
            .where('id', item.itemId)
            .where('active', true)
            .first()
          
          if (produit) {
            const sousTotal = produit.prix * item.quantite
            total += sousTotal
            produitsAvecQuantite.push({
              produitId: item.itemId,
              quantite: item.quantite,
              prix: produit.prix
            })
          }
        }
      }
      // LOG DEBUG
      console.log('DEBUG COMMANDE:', {
        menusAvecQuantite,
        produitsAvecQuantite,
        total,
        items: (payload as any).items
      })
    } else if (payload.produits) {
      // Fallback pour l'ancienne structure avec produits uniquement
      const produitIds = payload.produits.map((p: { produit_id: number }) => p.produit_id)
      const produits = await Produit.query()
        .whereIn('id', produitIds)
        .where('active', true)

      if (produits.length !== payload.produits.length) {
        return response.badRequest({ message: 'Certains produits ne sont pas disponibles' })
      }

      // Vérifier si ces produits font partie d'un menu
      const menusAssocies = await Database
        .from('menu_produits')
        .join('menus', 'menu_produits.menu_id', 'menus.id')
        .join('entreprise_menus', 'menus.id', 'entreprise_menus.menu_id')
        .whereIn('menu_produits.produit_id', produitIds)
        .where('entreprise_menus.entreprise_id', payload.entreprise_id || 0)
        .where('menus.active', true)
        .select('menus.id', 'menus.nom', 'menus.prix', 'menu_produits.produit_id')

      // Grouper par menu
      const menusGroupes = menusAssocies.reduce((acc: any, item: any) => {
        if (!acc[item.id]) {
          acc[item.id] = {
            id: item.id,
            nom: item.nom,
            prix: item.prix,
            produits: []
          }
        }
        acc[item.id].produits.push(item.produit_id)
        return acc
      }, {})

      // Vérifier si tous les produits commandés correspondent exactement à un menu
      let menuDetecte = null
      for (const menuId in menusGroupes) {
        const menu = menusGroupes[menuId]
        const produitsDuMenu = menu.produits.sort()
        const produitsCommandes = produitIds.sort()
        
        if (JSON.stringify(produitsDuMenu) === JSON.stringify(produitsCommandes)) {
          menuDetecte = menu
          break
        }
      }

      if (menuDetecte) {
        // C'est un menu complet, l'enregistrer comme tel
        const sousTotal = menuDetecte.prix * 1 // Quantité 1 pour le menu
        total += sousTotal
        menusAvecQuantite.push({
          menuId: menuDetecte.id,
          quantite: 1,
          prix: menuDetecte.prix
        }) 
      } else {
        // Traiter comme des produits individuels
        payload.produits!.forEach((p: { produit_id: number; quantite: number }) => {
          const produit = produits.find((prod) => prod.id === p.produit_id)!
          const sousTotal = produit.prix * p.quantite
          total += sousTotal
          produitsAvecQuantite.push({
            produitId: p.produit_id,
            quantite: p.quantite,
            prix: produit.prix
          })
        })
      }
    } else {
      // Cas où ni items ni produits ne sont fournis - ne devrait jamais arriver grâce à la validation
      return response.badRequest({ message: 'Aucun item à commander' })
    }

    // Créer la commande
    const commande = await Commande.create({
      entrepriseId: payload.entreprise_id || null,
      total,
      telephoneLivraison: payload.telephone_livraison,
      creneauxLivraison: JSON.stringify(payload.creneaux_livraison || []),
      notesCommande: payload.notes_commande,
      statut: 'en_attente',
      typeLivraison: (payload as any).type_livraison || 'livraison'
    })

    // Attacher les produits
    console.log('DEBUG: Attachement des produits:', produitsAvecQuantite)
    for (const item of produitsAvecQuantite) {
      console.log('DEBUG: Attachement produit:', item)
      await commande.related('produits').attach({
        [item.produitId]: {
          quantite: item.quantite,
          prix_unitaire: item.prix,
        },
      })
    }

    // Attacher les menus
    console.log('DEBUG: Attachement des menus:', menusAvecQuantite)
    for (const menu of menusAvecQuantite) {
      console.log('DEBUG: Attachement menu:', menu)
      await commande.related('menus').attach({
        [menu.menuId]: {
          quantite: menu.quantite,
          prix_unitaire: menu.prix,
        },
      })
    }

    await commande.load('produits')
    await commande.load('menus', (menuQuery) => {
      menuQuery.preload('produits')
    })
    await commande.load('entreprise')

    // Envoyer notification Discord
    try {
      const discordData = await this.getCommandeDiscordData(commande.id)
      await DiscordService.notifyNewCommande(discordData)
    } catch (error) {
      console.error('Erreur notification Discord:', error)
    }

    return response.created({
      message: 'Commande créée avec succès',
      commande,
      numeroCommande: commande.numeroCommande,
    })
  }

    /**
   * Récupère le statut d'une commande publique par son numéro avec vérification du téléphone
   */
  async getStatutPublic({ params, request, response }: HttpContext) {
    const { numero } = params
    const { telephone } = request.qs()

    // Vérifier que le numéro de téléphone est fourni
    if (!telephone) {
      return response.badRequest({ 
        message: 'Le numéro de téléphone est requis pour accéder aux informations de la commande'
      })
    }

    const commande = await Commande.query()
      .where('numero_commande', numero)
      .preload('entreprise')
      .preload('produits', (produitQuery) => {
        produitQuery.pivotColumns(['quantite', 'prix_unitaire'])
      })
      .preload('menus', (menuQuery) => {
        menuQuery
          .pivotColumns(['quantite', 'prix_unitaire'])
          .preload('produits')
      })
      .first()

    if (!commande) {
      return response.notFound({ message: 'Commande non trouvée' })
    }

    // Vérifier que le numéro de téléphone correspond
    if (commande.telephoneLivraison !== telephone.trim()) {
      return response.unauthorized({ 
        message: 'Le numéro de téléphone ne correspond pas à cette commande'
      })
    }

    // Parser les créneaux de livraison
    let creneaux = []
    if (commande.creneauxLivraison) {
      try {
        // Si c'est déjà un objet, on l'utilise directement
        if (typeof commande.creneauxLivraison === 'object') {
          creneaux = commande.creneauxLivraison
        } else {
          // Sinon on essaie de le parser comme JSON
          creneaux = JSON.parse(commande.creneauxLivraison)
        }
      } catch (error) {
        console.error('Erreur lors du parsing des créneaux:', error)
        creneaux = []
      }
    }

    // Transformer les données pour la nouvelle structure avec items
    const commandeObj = commande.serialize()
    
    // Créer la structure items pour compatibilité avec le frontend
    const items: any[] = []
    
    // Ajouter les menus en premier
    if (commandeObj.menus && commandeObj.menus.length > 0) {
      // Récupérer les données pivot des menus directement depuis la base de données
      const menusPivotData = await Database.from('commande_menus')
        .where('commande_id', commande.id)
        .select('menu_id', 'quantite', 'prix_unitaire')
      
      commandeObj.menus.forEach((menu: any) => {
        const pivot = menusPivotData.find((p: any) => p.menu_id === menu.id)
        
        if (pivot) {
          items.push({
            type: 'menu',
            itemId: menu.id,
            quantite: pivot.quantite,
            prix: pivot.prix_unitaire,
            menu: {
              id: menu.id,
              nom: menu.nom,
              description: menu.description,
              prix: menu.prix,
              produits: menu.produits || []
            }
          })
        }
      })
    }
    
    // Ajouter TOUS les produits individuels (même ceux qui peuvent faire partie d'un menu)
    if (commandeObj.produits && commandeObj.produits.length > 0) {
      // Récupérer les données pivot directement depuis la base de données
      const pivotData = await Database.from('commande_produits')
        .where('commande_id', commande.id)
        .select('produit_id', 'quantite', 'prix_unitaire')
      
      commandeObj.produits.forEach((produit: any) => {
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
        
        // Ajouter le produit comme item individuel
        items.push({
          type: 'produit',
          itemId: produit.id,
          quantite: produit.pivot.quantite,
          prix: produit.pivot.prix_unitaire,
          produit: {
            id: produit.id,
            nom: produit.nom,
            description: produit.description,
            prix: produit.prix,
            categorie: produit.categorie
          }
        })
      })
    }

    return response.ok({ 
      commande: {
        ...commandeObj,
        creneaux_livraison: creneaux,
        type_livraison: commande.typeLivraison,
        items: items // Nouvelle structure pour le frontend
      }
    })
  }
}
