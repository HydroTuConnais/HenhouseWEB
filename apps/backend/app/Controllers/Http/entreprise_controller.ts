import type { HttpContext } from '@adonisjs/core/http'
import Entreprise from '#models/entreprise'
import User from '#models/user'
import Menu from '#models/menu'
import { createEntrepriseValidator, updateEntrepriseValidator } from '#validators/entreprise'

export default class EntrepriseController {
  /**
   * Liste toutes les entreprises (ADMIN UNIQUEMENT)
   */
  async index({ response, auth }: HttpContext) {
    // Vérification d'authentification obligatoire
    if (!auth.user) {
      return response.unauthorized({ message: 'Authentification requise' })
    }

    // Seuls les admins peuvent voir la liste des entreprises
    if (auth.user.role !== 'admin') {
      return response.forbidden({ message: 'Accès refusé. Administrateur requis.' })
    }

    const entreprises = await Entreprise.query().orderBy('nom', 'asc')

    return response.ok({ entreprises })
  }

  /**
   * Récupère une entreprise spécifique avec ses relations (PROTÉGÉ)
   */
  async show({ params, response, auth }: HttpContext) {
    try {
      // Vérification d'authentification obligatoire
      if (!auth.user) {
        return response.unauthorized({ message: 'Authentification requise' })
      }

      const entreprise = await Entreprise.findOrFail(params.id)

      // Vérification d'accès : admin ou entreprise propriétaire
      if (auth.user.role !== 'admin' && auth.user.entrepriseId !== entreprise.id) {
        return response.forbidden({ message: 'Accès refusé' })
      }

      await entreprise.load('menus')
      await entreprise.load('produits')
      await entreprise.load('users')
      await entreprise.load('commandes')

      return response.ok({ entreprise })
    } catch (error) {
      if (error.name === 'E_ROW_NOT_FOUND') {
        return response.notFound({ message: 'Entreprise non trouvée' })
      }
      throw error
    }
  }

  /**
   * Récupère les informations publiques d'une entreprise (sans menus/produits)
   */
  async showPublic({ params, response }: HttpContext) {
    try {
      const entreprise = await Entreprise.query()
        .where('id', params.id)
        .select('id', 'nom', 'created_at', 'updated_at')
        .firstOrFail()

      return response.ok({ entreprise })
    } catch (error) {
      if (error.name === 'E_ROW_NOT_FOUND') {
        return response.notFound({ message: 'Entreprise non trouvée' })
      }
      throw error
    }
  }

  /**
   * Crée une nouvelle entreprise
   */
  async store({ request, response, auth }: HttpContext) {
    if (auth.user!.role !== 'admin') {
      return response.forbidden({ message: 'Accès refusé' })
    }

    const payload = await request.validateUsing(createEntrepriseValidator)
    const entreprise = await Entreprise.create(payload)

    return response.created({
      message: 'Entreprise créée avec succès',
      entreprise,
    })
  }

  /**
   * Met à jour une entreprise existante
   */
  async update({ params, request, response, auth }: HttpContext) {
    try {
      if (auth.user!.role !== 'admin') {
        return response.forbidden({ message: 'Accès refusé' })
      }

      const entreprise = await Entreprise.findOrFail(params.id)
      const payload = await request.validateUsing(updateEntrepriseValidator)

      entreprise.merge(payload)
      await entreprise.save()

      return response.ok({
        message: 'Entreprise mise à jour avec succès',
        entreprise,
      })
    } catch (error) {
      if (error.name === 'E_ROW_NOT_FOUND') {
        return response.notFound({ message: 'Entreprise non trouvée' })
      }
      throw error
    }
  }

  /**
   * Supprime une entreprise
   */
  async destroy({ params, response, auth }: HttpContext) {
    try {
      if (auth.user!.role !== 'admin') {
        return response.forbidden({ message: 'Accès refusé' })
      }

      const entreprise = await Entreprise.findOrFail(params.id)

      // Vérifier si l'entreprise a des utilisateurs ou commandes
      const usersCount = await User.query()
        .where('entreprise_id', entreprise.id)
        .count('* as total')

      if (Number.parseInt(usersCount[0].$extras.total) > 0) {
        return response.badRequest({
          message: 'Impossible de supprimer une entreprise avec des utilisateurs associés',
        })
      }

      await entreprise.delete()

      return response.ok({ message: 'Entreprise supprimée avec succès' })
    } catch (error) {
      if (error.name === 'E_ROW_NOT_FOUND') {
        return response.notFound({ message: 'Entreprise non trouvée' })
      }
      throw error
    }
  }

  /**
   * Récupère les menus associés à l'entreprise (PROTÉGÉ)
   */
  async getMenus({ params, response, auth }: HttpContext) {
    try {
      const entrepriseId = params.id

      // Vérification d'authentification obligatoire
      if (!auth.user) {
        return response.unauthorized({ message: 'Authentification requise pour accéder aux menus' })
      }

      // Vérification d'accès : admin ou entreprise propriétaire
      if (
        auth.user.role !== 'admin' &&
        auth.user.entrepriseId !== Number.parseInt(entrepriseId)
      ) {
        return response.forbidden({ message: 'Accès refusé' })
      }

      const entrepriseExists = await Entreprise.find(entrepriseId)
      if (!entrepriseExists) {
        return response.notFound({ message: 'Entreprise non trouvée' })
      }

      const menus = await Menu.query()
        .whereHas('entreprises', (query) => {
          query.where('entreprise_id', entrepriseId)
        })
        .where('active', true)

      return response.ok({ menus })
    } catch (error) {
      console.error('Erreur lors de la récupération des menus:', error)
      return response.internalServerError({
        message: 'Une erreur est survenue lors de la récupération des menus',
        error: error.message,
      })
    }
  }

  /**
   * Associe des menus à une entreprise
   */
  async associateMenus({ params, request, response, auth }: HttpContext) {
    try {
      if (auth.user!.role !== 'admin') {
        return response.forbidden({ message: 'Accès refusé' })
      }

      const entreprise = await Entreprise.findOrFail(params.id)

      const { menuIds } = request.only(['menuIds'])

      if (!menuIds || !Array.isArray(menuIds)) {
        return response.badRequest({ message: "menuIds doit être un tableau d'identifiants" })
      }

      const existingMenus = await Menu.query().whereIn('id', menuIds).select('id')
      const validMenuIds = existingMenus.map((menu) => menu.id)

      if (validMenuIds.length === 0) {
        return response.badRequest({ message: 'Aucun menu valide fourni' })
      }

      await entreprise.related('menus').sync(validMenuIds)

      await entreprise.load('menus')

      return response.ok({
        message: 'Menus associés avec succès',
        entreprise,
      })
    } catch (error) {
      if (error.name === 'E_ROW_NOT_FOUND') {
        return response.notFound({ message: 'Entreprise non trouvée' })
      }

      console.error("Erreur lors de l'association des menus:", error)
      return response.internalServerError({
        message: "Une erreur est survenue lors de l'association des menus",
        error: error.message,
      })
    }
  }

  async getProduits({ params, response, auth }: HttpContext) {
    try {
      // Vérification d'authentification obligatoire
      if (!auth.user) {
        return response.unauthorized({ message: 'Authentification requise pour accéder aux produits' })
      }

      const entreprise = await Entreprise.findOrFail(params.id)
      
      // Vérification d'accès : admin ou entreprise propriétaire
      if (auth.user.role !== 'admin' && auth.user.entrepriseId !== entreprise.id) {
        return response.forbidden({ message: 'Accès refusé' })
      }

      const produits = await entreprise.related('produits').query().where('active', true)

      return response.ok({ produits })
    } catch (error) {
      return response.badRequest({
        message: 'Erreur lors de la récupération des produits',
        error: error.message,
      })
    }
  }

  async associateProduits({ params, request, response }: HttpContext) {
    try {
      const entreprise = await Entreprise.findOrFail(params.id)
      const { produitIds } = request.only(['produitIds'])

      await entreprise.related('produits').sync(produitIds)

      return response.ok({
        message: 'Produits associés avec succès',
      })
    } catch (error) {
      return response.badRequest({
        message: "Erreur lors de l'association des produits",
        error: error.message,
      })
    }
  }

  async getMenusAndProduits({ params, response, auth }: HttpContext) {
    try {
      // Vérification d'authentification obligatoire
      if (!auth.user) {
        return response.unauthorized({ message: 'Authentification requise pour accéder au catalogue' })
      }

      // Vérification d'accès : admin ou entreprise propriétaire
      if (auth.user.role !== 'admin' && auth.user.entrepriseId !== Number.parseInt(params.id)) {
        return response.forbidden({ message: 'Accès refusé' })
      }

      const entreprise = await Entreprise.query()
        .where('id', params.id)
        .preload('menus', (menuQuery) => {
          menuQuery.where('active', true)
        })
        .preload('produits', (produitQuery) => {
          produitQuery.where('active', true)
        })
        .firstOrFail()

      return response.ok({
        entreprise: {
          id: entreprise.id,
          nom: entreprise.nom,
        },
        menus: entreprise.menus.map((menu) => ({
          ...menu.serialize(),
          fullImageUrl: menu.fullImageUrl,
        })),
        produits: entreprise.produits.map((produit) => ({
          ...produit.serialize(),
          fullImageUrl: produit.fullImageUrl,
        })),
      })
    } catch (error) {
      return response.badRequest({
        message: 'Erreur lors de la récupération des données',
        error: error.message,
      })
    }
  }

  /**
   * Récupère les commandes de l'entreprise
   */
  async getCommandes({ params, response, auth }: HttpContext) {
    try {
      const entrepriseId = params.id

      if (
        auth.user!.role !== 'admin' &&
        auth.user!.entrepriseId !== Number.parseInt(entrepriseId)
      ) {
        return response.forbidden({ message: 'Accès refusé' })
      }

      const entreprise = await Entreprise.findOrFail(entrepriseId)
      await entreprise.load('commandes', (query) => {
        query.orderBy('created_at', 'desc')
      })

      return response.ok({ commandes: entreprise.commandes })
    } catch (error) {
      if (error.name === 'E_ROW_NOT_FOUND') {
        return response.notFound({ message: 'Entreprise non trouvée' })
      }

      console.error('Erreur lors de la récupération des commandes:', error)
      return response.internalServerError({
        message: 'Une erreur est survenue lors de la récupération des commandes',
        error: error.message,
      })
    }
  }
}
