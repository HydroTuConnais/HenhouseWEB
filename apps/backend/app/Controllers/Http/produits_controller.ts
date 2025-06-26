// app/controllers/produits_controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import Produit from '#models/produit'
import { createProduitValidator, updateProduitValidator } from '#validators/produit'
import app from '@adonisjs/core/services/app'
import { cuid } from '@adonisjs/core/helpers'
import fs from 'node:fs/promises'

export default class ProduitsController {
  async index({ request, response }: HttpContext) {
    try {
      const categorie = request.input('categorie')
      const entrepriseId = request.input('entreprise_id')

      let query = Produit.query().where('active', true)

      if (categorie) {
        query = query.where('categorie', categorie)
      }

      if (entrepriseId) {
        query = query.whereHas('entreprises', (entrepriseQuery) => {
          entrepriseQuery.where('entreprises.id', entrepriseId)
        })
      }

      const produits = await query.exec()

      // Ajouter fullImageUrl à chaque produit
      const produitsWithImages = produits.map((produit: any) => ({
        ...produit.toJSON(),
        fullImageUrl: produit.imageUrl
          ? produit.imageUrl.startsWith('http')
            ? produit.imageUrl
            : `/uploads/produits/${produit.imageUrl}`
          : null,
      }))

      return response.ok(produitsWithImages)
    } catch (error) {
      return response.badRequest({
        message: 'Erreur lors de la récupération des produits',
        error: error.message,
      })
    }
  }

  async show({ params, response }: HttpContext) {
    try {
      const produit = await Produit.query()
        .where('id', params.id)
        .preload('entreprises')
        .firstOrFail()

      return response.ok({
        ...produit.serialize(),
        fullImageUrl: produit.fullImageUrl,
      })
    } catch (error) {
      return response.notFound({
        message: 'Produit non trouvé',
      })
    }
  }

  async store({ request, response }: HttpContext) {
    try {
      const payload = await request.validateUsing(createProduitValidator)
      const { entrepriseIds, ...produitData } = payload

      if (produitData.active === undefined) {
        produitData.active = true
      }

      const produit = await Produit.create(produitData)

      if (entrepriseIds && entrepriseIds.length > 0) {
        await produit.related('entreprises').attach(entrepriseIds)
      }

      await produit.load('entreprises')

      return response.created({
        message: 'Produit créé avec succès',
        produit: {
          ...produit.serialize(),
          fullImageUrl: produit.fullImageUrl,
        },
      })
    } catch (error) {
      return response.badRequest({
        message: 'Erreur lors de la création du produit',
        error: error.message,
      })
    }
  }

  async uploadImage({ params, request, response }: HttpContext) {
    try {
      const produit = await Produit.findOrFail(params.id)
      const image = request.file('image', {
        size: '5mb',
        extnames: ['jpg', 'jpeg', 'png', 'webp'],
      })

      if (!image || !image.isValid) {
        return response.badRequest({
          message: 'Image invalide',
          errors: image?.errors,
        })
      }

      const uploadsDir = app.makePath('public/uploads/produits')
      await fs.mkdir(uploadsDir, { recursive: true })

      if (produit.imageUrl) {
        try {
          await fs.unlink(app.makePath('public/uploads/produits', produit.imageUrl))
        } catch (error) {
          // L'image n'existe pas, pas grave
        }
      }

      const fileName = `${cuid()}.${image.extname}`
      const imagePath = `uploads/produits/${fileName}`

      await image.move(uploadsDir, {
        name: fileName,
      })

      produit.imageUrl = fileName
      produit.imagePath = imagePath
      await produit.save()

      return response.ok({
        message: 'Image uploadée avec succès',
        produit: {
          ...produit.serialize(),
          fullImageUrl: produit.fullImageUrl,
        },
      })
    } catch (error) {
      return response.badRequest({
        message: "Erreur lors de l'upload de l'image",
        error: error.message,
      })
    }
  }

  async update({ params, request, response }: HttpContext) {
    try {
      const produit = await Produit.findOrFail(params.id)
      const payload = await request.validateUsing(updateProduitValidator)
      const { entrepriseIds, ...produitData } = payload

      produit.merge(produitData)
      await produit.save()

      if (entrepriseIds) {
        await produit.related('entreprises').sync(entrepriseIds)
      }

      await produit.load('entreprises')

      return response.ok({
        message: 'Produit mis à jour avec succès',
        produit: {
          ...produit.serialize(),
          fullImageUrl: produit.fullImageUrl,
        },
      })
    } catch (error) {
      return response.badRequest({
        message: 'Erreur lors de la mise à jour du produit',
        error: error.message,
      })
    }
  }

  async destroy({ params, response }: HttpContext) {
    try {
      const produit = await Produit.findOrFail(params.id)

      if (produit.imageUrl) {
        try {
          await fs.unlink(app.makePath('public/uploads/produits', produit.imageUrl))
        } catch (error) {
          // L'image n'existe pas, pas grave
        }
      }

      await produit.related('entreprises').detach()
      await produit.delete()

      return response.ok({
        message: 'Produit supprimé avec succès',
      })
    } catch (error) {
      return response.badRequest({
        message: 'Erreur lors de la suppression du produit',
        error: error.message,
      })
    }
  }

  async getEntreprises({ params, response }: HttpContext) {
    try {
      const produit = await Produit.findOrFail(params.id)
      await produit.load('entreprises')

      return response.ok({
        produit: produit.serialize(),
        entreprises: produit.entreprises,
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
      const produit = await Produit.findOrFail(params.id)
      const { entrepriseIds } = request.only(['entrepriseIds'])

      await produit.related('entreprises').sync(entrepriseIds)

      return response.ok({
        message: 'Produit associé aux entreprises avec succès',
      })
    } catch (error) {
      return response.badRequest({
        message: "Erreur lors de l'association",
        error: error.message,
      })
    }
  }
}
