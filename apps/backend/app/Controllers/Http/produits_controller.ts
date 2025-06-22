// app/controllers/produits_controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import Produit from '#models/produit'
import ImageService from '#services/image_service'
import { createProduitValidator, updateProduitValidator } from '#validators/produit'

export default class ProduitsController {
  /**
   * Affiche tous les produits
   */
  async index({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const { menuId } = request.qs()

    let query = Produit.query().preload('menu')

    if (user.role !== 'admin') {
      // Filtrer par entreprise pour les utilisateurs non-admin
      query = query.whereHas('menu', (menuQuery) => {
        menuQuery.whereHas('entreprises', (entQuery) => {
          entQuery.where('entreprise_id', user.entrepriseId!)
        })
      })
    }

    if (menuId) {
      query = query.where('menu_id', menuId)
    }

    query = query.where('active', true)

    const produits = await query.exec()

    const produitsWithImages = produits.map((produit) => ({
      ...produit.toJSON(),
      fullImageUrl: produit.fullImageUrl,
    }))

    return response.ok({ produits: produitsWithImages })
  }

  /**
   * Affiche un produit spécifique
   */
  async show({ params, auth, response }: HttpContext) {
    const user = auth.user!
    const produitId = params.id

    let query = Produit.query().where('id', produitId).preload('menu')

    if (user.role !== 'admin') {
      query = query.whereHas('menu', (menuQuery) => {
        menuQuery.whereHas('entreprises', (entQuery) => {
          entQuery.where('entreprise_id', user.entrepriseId!)
        })
      })
    }

    const produit = await query.first()

    if (!produit) {
      return response.notFound({ message: 'Produit non trouvé' })
    }

    return response.ok({
      produit: {
        ...produit.toJSON(),
        fullImageUrl: produit.fullImageUrl,
      },
    })
  }

  /**
   * Crée un nouveau produit
   */
  async store({ request, response, auth }: HttpContext) {
    if (auth.user!.role !== 'admin') {
      return response.forbidden({ message: 'Accès refusé' })
    }

    const payload = await request.validateUsing(createProduitValidator)
    const produit = await Produit.create(payload)

    // Gestion de l'image
    const image = request.file('image')
    if (image) {
      try {
        const uploadResult = await ImageService.uploadImage(image, 'produits', {
          width: 800,
          height: 600,
          quality: 85,
          format: 'webp',
        })

        produit.imageUrl = uploadResult.filename
        produit.imagePath = uploadResult.path
        await produit.save()
      } catch (error) {
        await produit.delete()
        return response.badRequest({ error: error.message })
      }
    }

    return response.created({
      message: 'Produit créé avec succès',
      produit: {
        ...produit.toJSON(),
        fullImageUrl: produit.fullImageUrl,
      },
    })
  }

  /**
   * Met à jour un produit
   */
  async update({ params, request, response, auth }: HttpContext) {
    if (auth.user!.role !== 'admin') {
      return response.forbidden({ message: 'Accès refusé' })
    }

    const produit = await Produit.findOrFail(params.id)
    const payload = await request.validateUsing(updateProduitValidator)

    const oldImagePath = produit.imagePath

    produit.merge(payload)

    // Gestion de la nouvelle image
    const image = request.file('image')
    if (image) {
      try {
        const uploadResult = await ImageService.uploadImage(image, 'produits', {
          width: 800,
          height: 600,
          quality: 85,
          format: 'webp',
        })

        produit.imageUrl = uploadResult.filename
        produit.imagePath = uploadResult.path

        // Supprimer l'ancienne image
        if (oldImagePath) {
          await ImageService.deleteImage(produit.imageUrl!)
        }
      } catch (error) {
        return response.badRequest({ error: error.message })
      }
    }

    await produit.save()

    return response.ok({
      message: 'Produit mis à jour avec succès',
      produit: {
        ...produit.toJSON(),
        fullImageUrl: produit.fullImageUrl,
      },
    })
  }

  /**
   * Supprime un produit
   */
  async destroy({ params, response, auth }: HttpContext) {
    if (auth.user!.role !== 'admin') {
      return response.forbidden({ message: 'Accès refusé' })
    }

    const produit = await Produit.findOrFail(params.id)

    // Supprimer l'image associée
    if (produit.imageUrl) {
      await ImageService.deleteImage(produit.imageUrl)
    }

    produit.active = false
    await produit.save()

    return response.ok({ message: 'Produit supprimé avec succès' })
  }

  /**
   * Upload d'image pour un produit existant
   */
  async uploadImage({ params, request, response, auth }: HttpContext) {
    if (auth.user!.role !== 'admin') {
      return response.forbidden({ message: 'Accès refusé' })
    }

    const produit = await Produit.find(params.id)
  
    if (!produit) {
      return response.notFound({ message: 'Produit non trouvé' })
    }
    
    const image = request.file('image')

    if (!image) {
      return response.badRequest({ error: 'Aucune image fournie' })
    }

    try {
      if (produit.imageUrl) {
        await ImageService.deleteImage(produit.imageUrl)
      }

      const uploadResult = await ImageService.uploadImage(image, 'produits', {
        width: 800,
        height: 600,
        quality: 85,
        format: 'webp',
      })

      produit.imageUrl = uploadResult.filename
      produit.imagePath = uploadResult.path
      await produit.save()

      return response.ok({
        message: 'Image uploadée avec succès',
        produit: {
          ...produit.toJSON(),
          fullImageUrl: produit.fullImageUrl,
        },
      })
    } catch (error) {
      return response.badRequest({ error: error.message })
    }
  }
}
