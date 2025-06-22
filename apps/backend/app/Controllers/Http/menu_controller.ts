import Menu from '#models/menu'
import ImageService from '#services/image_service'

import { createMenuValidator, updateMenuValidator } from '#validators/menu'
import type { HttpContext } from '@adonisjs/core/http'

export default class MenusController {
  async index({ auth, response }: HttpContext) {
    const user = auth.user!

    let menus
    if (user.role === 'admin') {
      menus = await Menu.query().preload('produits').preload('entreprises').where('active', true)
    } else {
      // Pour les utilisateurs entreprise, on affiche uniquement les menus de leur entreprise
      menus = await Menu.query()
        .preload('produits')
        .whereHas('entreprises', (query) => {
          query.where('entreprise_id', user.entrepriseId!)
        })
        .where('active', true)
    }

    const menusWithImages = menus.map((menu) => ({
      ...menu.toJSON(),
      fullImageUrl: menu.fullImageUrl,
    }))

    return response.ok({ menus: menusWithImages })
  }

  async show({ params, auth, response }: HttpContext) {
    const user = auth.user!
    const menuId = params.id

    let menu
    if (user.role === 'admin') {
      menu = await Menu.query()
        .where('id', menuId)
        .preload('produits')
        .preload('entreprises')
        .first()
    } else {
      menu = await Menu.query()
        .where('id', menuId)
        .whereHas('entreprises', (query) => {
          query.where('entreprise_id', user.entrepriseId!)
        })
        .preload('produits')
        .first()
    }

    if (!menu) {
      return response.notFound({ message: 'Menu non trouvé' })
    }

    return response.ok({
      menu: {
        ...menu.toJSON(),
        fullImageUrl: menu.fullImageUrl,
      },
    })
  }

  async store({ request, response, auth }: HttpContext) {
    if (auth.user!.role !== 'admin') {
      return response.forbidden({ message: 'Accès refusé' })
    }

    const payload = await request.validateUsing(createMenuValidator)
    
    const { entrepriseIds, ...menuData } = payload
    
    const menu = await Menu.create(menuData)

    try {
      if (entrepriseIds && Array.isArray(entrepriseIds)) {
        await menu.related('entreprises').attach(entrepriseIds)
      }
    } catch (error) {
      console.error('Erreur lors du attach:', error.message)
      return response.badRequest({ 
        message: "Erreur lors de l'association avec les entreprises. Vérifiez que les IDs d'entreprise existent.", 
        details: error.message 
      })
    }

    const image = request.file('image')
    if (image) {
      try {
        const uploadResult = await ImageService.uploadImage(image, 'menus', {
          width: 800,
          height: 600,
          quality: 85,
          format: 'webp',
        })

        menu.imageUrl = uploadResult.filename
        menu.imagePath = uploadResult.path
        await menu.save()
      } catch (error) {
        await menu.delete()
        return response.badRequest({ error: error.message })
      }
    }

    await menu.load('entreprises')

    return response.created({
      message: 'Menu créé avec succès',
      menu: {
        ...menu.toJSON(),
        fullImageUrl: menu.fullImageUrl,
      },
    })
  }

  async update({ params, request, response, auth }: HttpContext) {
    if (auth.user!.role !== 'admin') {
      return response.forbidden({ message: 'Accès refusé' })
    }

    const menu = await Menu.findOrFail(params.id)
    const payload = await request.validateUsing(updateMenuValidator)

    const { entrepriseIds, ...menuData } = payload
    
    const oldImagePath = menu.imagePath

    menu.merge(menuData)

    try {
      if (entrepriseIds && Array.isArray(entrepriseIds)) {
        await menu.related('entreprises').sync(entrepriseIds)
      }
    } catch (error) {
      console.error('Erreur lors du sync:', error.message)
      return response.badRequest({ 
        message: "Erreur lors de l'association avec les entreprises. Vérifiez que les IDs d'entreprise existent.", 
        details: error.message 
      })
    }

    const image = request.file('image')
    if (image) {
      try {
        const uploadResult = await ImageService.uploadImage(image, 'menus', {
          width: 800,
          height: 600,
          quality: 85,
          format: 'webp',
        })

        menu.imageUrl = uploadResult.filename
        menu.imagePath = uploadResult.path

        if (oldImagePath) {
          await ImageService.deleteImage(menu.imageUrl!)
        }
      } catch (error) {
        return response.badRequest({ error: error.message })
      }
    }

    await menu.save()
    
    // Charger les relations pour la réponse
    await menu.load('entreprises')

    return response.ok({
      message: 'Menu mis à jour avec succès',
      menu: {
        ...menu.toJSON(),
        fullImageUrl: menu.fullImageUrl,
      },
    })
  }

  async uploadImage({ params, request, response, auth }: HttpContext) {
    if (auth.user!.role !== 'admin') {
      return response.forbidden({ message: 'Accès refusé' })
    }

    const menu = await Menu.find(params.id)
  
    if (!menu) {
      return response.notFound({ message: 'Menu non trouvé' })
    }

    const image = request.file('image')

    if (!image) {
      return response.badRequest({ error: 'Aucune image fournie' })
    }

    try {
      if (menu.imageUrl) {
        await ImageService.deleteImage(menu.imageUrl)
      }

      const uploadResult = await ImageService.uploadImage(image, 'menus', {
        width: 800,
        height: 600,
        quality: 85,
        format: 'webp',
      })

      menu.imageUrl = uploadResult.filename
      menu.imagePath = uploadResult.path
      await menu.save()

      return response.ok({
        message: 'Image uploadée avec succès',
        menu: {
          ...menu.toJSON(),
          fullImageUrl: menu.fullImageUrl,
        },
      })
    } catch (error) {
      return response.badRequest({ error: error.message })
    }
  }
}
