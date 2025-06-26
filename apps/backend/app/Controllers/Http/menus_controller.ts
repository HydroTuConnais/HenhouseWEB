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
      if (user?.role === 'admin') {
        // L'admin voit tous les menus, sans filtrage par entreprise
      } else {
        if (entrepriseId) {
          query = query.whereHas('entreprises', (entrepriseQuery) => {
            entrepriseQuery.where('entreprises.id', entrepriseId)
          })
        } else {
          if (user && user.entrepriseId) {
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
      const menu = await Menu.query().where('id', params.id).preload('entreprises').firstOrFail()

      return response.ok({
        ...menu.serialize(),
        fullImageUrl: menu.fullImageUrl,
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
}
