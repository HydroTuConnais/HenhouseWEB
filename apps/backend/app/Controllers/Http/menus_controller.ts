import type { HttpContext } from '@adonisjs/core/http'
import Menu from '#models/menu'
import { createMenuValidator, updateMenuValidator } from '#validators/menu'
import app from '@adonisjs/core/services/app'
import { cuid } from '@adonisjs/core/helpers'
import fs from 'node:fs/promises'

export default class MenusController {
  async index({ request, response, auth }: HttpContext) {
    try {
      const entrepriseId = request.input('entreprise_id')

      let query = Menu.query().where('active', true)

      const user = auth?.user
      
      // Si la route est publique (pas d'utilisateur connecté)
      if (!user) {
        // Pour les utilisateurs non-connectés, montrer tous les menus actifs
        if (entrepriseId) {
          query = query.whereHas('entreprises', (entrepriseQuery) => {
            entrepriseQuery.where('entreprises.id', entrepriseId)
          })
        }
        // Sinon, montrer tous les menus actifs (publics et d'entreprises)
      } else {
        // Logique existante pour les utilisateurs connectés
        if (user.role === 'admin') {
          // L'admin voit tous les menus, sans filtrage par entreprise
        } else {
          if (entrepriseId) {
            query = query.whereHas('entreprises', (entrepriseQuery) => {
              entrepriseQuery.where('entreprises.id', entrepriseId)
            })
          } else {
            if (user.entrepriseId) {
              query = query.where((subQuery) => {
                subQuery
                  .whereDoesntHave('entreprises', () => {})
                  .orWhereHas('entreprises', (entrepriseQuery) => {
                    entrepriseQuery.where('entreprises.id', user.entrepriseId!)
                  })
              })
            } else {
              query = query.whereDoesntHave('entreprises', () => {})
            }
          }
        }
      }

      const menus = await query.exec()

      // Ajouter fullImageUrl à chaque menu
      const menusWithImages = menus.map((menu: any) => ({
        ...menu.toJSON(),
        fullImageUrl: menu.imageUrl
          ? menu.imageUrl.startsWith('http')
            ? menu.imageUrl
            : `/uploads/menus/${menu.imageUrl}`
          : null,
      }))

      return response.ok(menusWithImages)
    } catch (error) {
      return response.badRequest({
        message: 'Erreur lors de la récupération des menus',
        error: error.message,
      })
    }
  }

  async show({ params, response }: HttpContext) {
    try {
      const menu = await Menu.query()
        .where('id', params.id)
        .preload('entreprises')
        .preload('produits')
        .firstOrFail()

      // Ajouter les données pivot et fullImageUrl pour chaque produit
      const produitsWithDetails = menu.produits.map((produit: any) => ({
        ...produit.toJSON(),
        fullImageUrl: produit.imageUrl
          ? produit.imageUrl.startsWith('http')
            ? produit.imageUrl
            : `/uploads/produits/${produit.imageUrl}`
          : null,
        pivot: produit.$pivot ? {
          quantite: produit.$pivot.quantite || 1,
          ordre: produit.$pivot.ordre || null,
          disponible: produit.$pivot.disponible !== undefined ? produit.$pivot.disponible : true,
        } : {
          quantite: 1,
          ordre: null,
          disponible: true,
        }
      }))

      return response.ok({
        id: menu.id,
        nom: menu.nom,
        description: menu.description,
        prix: menu.prix,
        active: menu.active,
        createdAt: menu.createdAt,
        updatedAt: menu.updatedAt,
        imageUrl: menu.imageUrl,
        imagePath: menu.imagePath,
        fullImageUrl: menu.fullImageUrl,
        entreprises: menu.entreprises,
        produits: produitsWithDetails,
      })
    } catch (error) {
      return response.notFound({
        message: 'Menu non trouvé',
      })
    }
  }

  async store({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(createMenuValidator)
      const { entrepriseIds, ...menuData } = payload

      if (menuData.active === undefined) {
        menuData.active = true
      }

      const menu = await Menu.create(menuData)

      if (entrepriseIds && entrepriseIds.length > 0) {
        await menu.related('entreprises').attach(entrepriseIds)
      }

      await menu.load('entreprises')

      return response.created({
        message: 'Menu créé avec succès',
        menu: {
          ...menu.serialize(),
          fullImageUrl: menu.fullImageUrl,
        },
      })
    } catch (error) {
      return response.badRequest({
        message: 'Erreur lors de la création du menu',
        error: error.message,
      })
    }
  }

  async update({ params, request, response }: HttpContext) {
    try {
      const menu = await Menu.findOrFail(params.id)
      const payload = await request.validateUsing(updateMenuValidator)
      const { entrepriseIds, ...menuData } = payload

      menu.merge(menuData)
      await menu.save()

      if (entrepriseIds !== undefined) {
        await menu.related('entreprises').sync(entrepriseIds)
      }

      await menu.load('entreprises')

      return response.ok({
        message: 'Menu mis à jour avec succès',
        menu: {
          ...menu.serialize(),
          fullImageUrl: menu.fullImageUrl,
        },
      })
    } catch (error) {
      return response.badRequest({
        message: 'Erreur lors de la mise à jour du menu',
        error: error.message,
      })
    }
  }

  async uploadImage({ params, request, response }: HttpContext) {
    try {
      const menu = await Menu.findOrFail(params.id)
      const image = request.file('image', {
        size: '5mb',
        extnames: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      })

      if (!image || !image.isValid) {
        return response.badRequest({
          message: 'Image invalide',
          errors: image?.errors,
        })
      }

      const uploadsDir = app.makePath('public/uploads/menus')
      await fs.mkdir(uploadsDir, { recursive: true })

      if (menu.imageUrl) {
        try {
          await fs.unlink(app.makePath('public/uploads/menus', menu.imageUrl))
        } catch (error) {
          // L'image n'existe pas, pas grave
        }
      }

      const fileName = `${cuid()}.${image.extname}`
      const imagePath = `uploads/menus/${fileName}`

      await image.move(uploadsDir, {
        name: fileName,
      })

      menu.imageUrl = fileName
      menu.imagePath = imagePath
      await menu.save()

      return response.ok({
        message: 'Image uploadée avec succès',
        menu: {
          ...menu.serialize(),
          fullImageUrl: menu.fullImageUrl,
        },
      })
    } catch (error) {
      return response.badRequest({
        message: "Erreur lors de l'upload de l'image",
        error: error.message,
      })
    }
  }

  async destroy({ params, response }: HttpContext) {
    try {
      const menu = await Menu.findOrFail(params.id)

      if (menu.imageUrl) {
        try {
          await fs.unlink(app.makePath('public/uploads/menus', menu.imageUrl))
        } catch (error) {
          // L'image n'existe pas, pas grave
        }
      }

      await menu.related('entreprises').detach()
      await menu.delete()

      return response.ok({
        message: 'Menu supprimé avec succès',
      })
    } catch (error) {
      return response.badRequest({
        message: 'Erreur lors de la suppression du menu',
        error: error.message,
      })
    }
  }

  async getEntreprises({ params, response }: HttpContext) {
    try {
      const menu = await Menu.findOrFail(params.id)
      await menu.load('entreprises')

      return response.ok({
        menu: menu.serialize(),
        entreprises: menu.entreprises,
      })
    } catch (error) {
      return response.badRequest({
        message: 'Erreur lors de la récupération des entreprises',
        error: error.message,
      })
    }
  }

  async associateEntreprises({ params, request, response }: HttpContext) {
    try {
      const menu = await Menu.findOrFail(params.id)
      const { entrepriseIds } = request.only(['entrepriseIds'])

      await menu.related('entreprises').sync(entrepriseIds)

      return response.ok({
        message: 'Menu associé aux entreprises avec succès',
      })
    } catch (error) {
      return response.badRequest({
        message: "Erreur lors de l'association",
        error: error.message,
      })
    }
  }

  // Méthodes pour gérer les produits d'un menu
  async getProduits({ params, response }: HttpContext) {
    try {
      const menu = await Menu.findOrFail(params.id)
      await menu.load('produits')

      // Ajouter les données pivot et fullImageUrl pour chaque produit
      const produitsWithDetails = menu.produits.map((produit: any) => ({
        ...produit.toJSON(),
        fullImageUrl: produit.imageUrl
          ? produit.imageUrl.startsWith('http')
            ? produit.imageUrl
            : `/uploads/produits/${produit.imageUrl}`
          : null,
        pivot: produit.$pivot ? {
          quantite: produit.$pivot.quantite || 1,
          ordre: produit.$pivot.ordre || null,
          disponible: produit.$pivot.disponible !== undefined ? produit.$pivot.disponible : true,
        } : {
          quantite: 1,
          ordre: null,
          disponible: true,
        }
      }))

      return response.ok({
        menu: {
          id: menu.id,
          nom: menu.nom,
          description: menu.description,
          prix: menu.prix,
          active: menu.active,
          createdAt: menu.createdAt,
          updatedAt: menu.updatedAt,
          imageUrl: menu.imageUrl,
          imagePath: menu.imagePath,
          fullImageUrl: menu.fullImageUrl,
        },
        produits: produitsWithDetails,
      })
    } catch (error) {
      return response.badRequest({
        message: 'Erreur lors de la récupération des produits',
        error: error.message,
      })
    }
  }

  async addProduit({ params, request, response }: HttpContext) {
    try {
      const menu = await Menu.findOrFail(params.id)
      const { produitId, quantite = 1, ordre = null, disponible = true } = request.only([
        'produitId',
        'quantite',
        'ordre',
        'disponible'
      ])

      if (!produitId) {
        return response.badRequest({
          message: 'ID du produit requis',
        })
      }

      // Vérifier si le produit est déjà dans le menu
      const existingProduit = await menu
        .related('produits')
        .pivotQuery()
        .where('produit_id', produitId)
        .first()

      if (existingProduit) {
        return response.badRequest({
          message: 'Ce produit est déjà dans le menu',
        })
      }

      await menu.related('produits').attach({
        [produitId]: {
          quantite,
          ordre,
          disponible,
        }
      })

      return response.ok({
        message: 'Produit ajouté au menu avec succès',
      })
    } catch (error) {
      return response.badRequest({
        message: 'Erreur lors de l\'ajout du produit',
        error: error.message,
      })
    }
  }

  async updateProduit({ params, request, response }: HttpContext) {
    try {
      const menu = await Menu.findOrFail(params.id)
      const { produitId } = params
      const { quantite, ordre, disponible } = request.only([
        'quantite',
        'ordre',
        'disponible'
      ])

      // Vérifier si le produit est dans le menu
      const existingProduit = await menu
        .related('produits')
        .pivotQuery()
        .where('produit_id', produitId)
        .first()

      if (!existingProduit) {
        return response.notFound({
          message: 'Ce produit n\'est pas dans le menu',
        })
      }

      const updateData: any = {}
      if (quantite !== undefined) updateData.quantite = quantite
      if (ordre !== undefined) updateData.ordre = ordre
      if (disponible !== undefined) updateData.disponible = disponible

      await menu
        .related('produits')
        .pivotQuery()
        .where('produit_id', produitId)
        .update(updateData)

      return response.ok({
        message: 'Produit mis à jour dans le menu avec succès',
      })
    } catch (error) {
      return response.badRequest({
        message: 'Erreur lors de la mise à jour du produit',
        error: error.message,
      })
    }
  }

  async removeProduit({ params, response }: HttpContext) {
    try {
      const menu = await Menu.findOrFail(params.id)
      const { produitId } = params

      await menu.related('produits').detach([produitId])

      return response.ok({
        message: 'Produit retiré du menu avec succès',
      })
    } catch (error) {
      return response.badRequest({
        message: 'Erreur lors de la suppression du produit',
        error: error.message,
      })
    }
  }

  /**
   * Liste des menus publics (non liés à des entreprises)
   */
  async indexPublic({ response }: HttpContext) {
    try {
      // Récupérer seulement les menus qui ne sont liés à aucune entreprise
      const menus = await Menu.query()
        .where('active', true)
        .whereDoesntHave('entreprises', () => {}) // Menus sans entreprises associées
        .orderBy('nom', 'asc')

      // Ajouter fullImageUrl à chaque menu
      const menusWithImages = menus.map((menu: any) => ({
        ...menu.toJSON(),
        fullImageUrl: menu.imageUrl
          ? menu.imageUrl.startsWith('http')
            ? menu.imageUrl
            : `/uploads/menus/${menu.imageUrl}`
          : null,
      }))

      return response.ok({ menus: menusWithImages })
    } catch (error) {
      console.error('Erreur lors de la récupération des menus publics:', error)
      return response.internalServerError({
        message: 'Une erreur est survenue lors de la récupération des menus',
        error: error.message,
      })
    }
  }

  /**
   * Affiche un menu public (non lié à une entreprise)
   */
  async showPublic({ params, response }: HttpContext) {
    try {
      const menu = await Menu.query()
        .where('id', params.id)
        .where('active', true)
        .whereDoesntHave('entreprises', () => {}) // Vérifier qu'il n'est lié à aucune entreprise
        .firstOrFail()

      return response.ok({ 
        menu: {
          ...menu.toJSON(),
          fullImageUrl: menu.imageUrl
            ? menu.imageUrl.startsWith('http')
              ? menu.imageUrl
              : `/uploads/menus/${menu.imageUrl}`
            : null,
        }
      })
    } catch (error) {
      if (error.name === 'E_ROW_NOT_FOUND') {
        return response.notFound({ message: 'Menu public non trouvé' })
      }
      throw error
    }
  }

  /**
   * Produits d'un menu public
   */
  async getProduitsPublic({ params, response }: HttpContext) {
    try {
      const menu = await Menu.query()
        .where('id', params.id)
        .where('active', true)
        .whereDoesntHave('entreprises', () => {}) // Menu public uniquement
        .firstOrFail()

      await menu.load('produits', (query) => {
        query.where('active', true).orderBy('pivot_ordre', 'asc')
      })

      const produits = menu.produits.map((produit) => ({
        ...produit.serialize(),
        pivot: {
          quantite: produit.$extras.pivot_quantite || 1,
          ordre: produit.$extras.pivot_ordre || 1,
          disponible: produit.$extras.pivot_disponible ?? true,
        },
      }))

      return response.ok({ produits })
    } catch (error) {
      if (error.name === 'E_ROW_NOT_FOUND') {
        return response.notFound({ message: 'Menu public non trouvé' })
      }
      throw error
    }
  }
}
