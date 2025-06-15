import type { HttpContext } from '@adonisjs/core/http'
import Menu from '#models/menu'
import { createMenuValidator, updateMenuValidator } from '#validators/menu'

export default class MenusController {
  async index({ auth, response }: HttpContext) {
    const user = auth.user!
    
    let menus
    if (user.role === 'admin') {
      menus = await Menu.query()
        .preload('produits')
        .preload('entreprises')
        .where('active', true)
    } else {
      // Pour les utilisateurs entreprise, on affiche uniquement les menus de leur entreprise
      menus = await Menu.query()
        .preload('produits')
        .whereHas('entreprises', (query) => {
          query.where('entreprise_id', user.entrepriseId!)
        })
        .where('active', true)
    }
    
    return response.ok({ menus })
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
    
    return response.ok({ menu })
  }

  async store({ request, response, auth }: HttpContext) {
    if (auth.user!.role !== 'admin') {
      return response.forbidden({ message: 'Accès refusé' })
    }
    
    const payload = await request.validateUsing(createMenuValidator)
    const menu = await Menu.create(payload)
    
    return response.created({
      message: 'Menu créé avec succès',
      menu
    })
  }

  async update({ params, request, response, auth }: HttpContext) {
    if (auth.user!.role !== 'admin') {
      return response.forbidden({ message: 'Accès refusé' })
    }
    
    const menu = await Menu.findOrFail(params.id)
    const payload = await request.validateUsing(updateMenuValidator)
    
    menu.merge(payload)
    await menu.save()
    
    return response.ok({
      message: 'Menu mis à jour avec succès',
      menu
    })
  }

  async destroy({ params, response, auth }: HttpContext) {
    if (auth.user!.role !== 'admin') {
      return response.forbidden({ message: 'Accès refusé' })
    }
    
    const menu = await Menu.findOrFail(params.id)
    menu.active = false
    await menu.save()
    
    return response.ok({ message: 'Menu supprimé avec succès' })
  }
}