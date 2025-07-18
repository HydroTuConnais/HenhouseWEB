import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import Entreprise from '#models/entreprise'
import Menu from '#models/menu'
import Produit from '#models/produit'
import { createUserValidator, updateUserValidator } from '#validators/user'
import { createEntrepriseValidator, updateEntrepriseValidator } from '#validators/entreprise'
import { createMenuValidator, updateMenuValidator } from '#validators/menu'
import { createProduitValidator, updateProduitValidator } from '#validators/produit'

export default class AdminController {
  // ========== GESTION DES UTILISATEURS ==========
  
  async getUsers({ response, auth }: HttpContext) {
    // Vérifier que l'utilisateur est admin
    if (auth.user?.role !== 'admin') {
      return response.unauthorized({ message: 'Accès refusé' })
    }

    const users = await User.query().preload('entreprise')
    return response.ok({ users })
  }

  async createUser({ request, response, auth }: HttpContext) {
    if (auth.user?.role !== 'admin') {
      return response.unauthorized({ message: 'Accès refusé' })
    }

    const payload = await request.validateUsing(createUserValidator)
    
    const existingUser = await User.findBy('username', payload.username)
    
    if (existingUser) {
      return response.conflict({
        message: "Ce nom d'utilisateur est déjà utilisé",
        field: 'username',
      })
    }
    
    const user = await User.create(payload)

    if (user.entrepriseId) {
      await user.load('entreprise')
    }
    return response.created({ user })
  }

  async updateUser({ request, response, auth, params }: HttpContext) {
    if (auth.user?.role !== 'admin') {
      return response.unauthorized({ message: 'Accès refusé' })
    }

    const user = await User.findOrFail(params.id)
    const payload = await request.validateUsing(updateUserValidator)

    // Gérer le mot de passe séparément pour assurer le hashage
    if (payload.password) {
      await user.updatePassword(payload.password)
      delete payload.password
    }

    user.merge(payload)
    await user.save()
    await user.load('entreprise')

    return response.ok({ user })
  }

  async deleteUser({ response, auth, params }: HttpContext) {
    if (auth.user?.role !== 'admin') {
      return response.unauthorized({ message: 'Accès refusé' })
    }

    const user = await User.findOrFail(params.id)
    await user.delete()

    return response.ok({ message: 'Utilisateur supprimé avec succès' })
  }

  // ========== GESTION DES ENTREPRISES ==========
  
  async getEntreprises({ response, auth }: HttpContext) {
    if (auth.user?.role !== 'admin') {
      return response.unauthorized({ message: 'Accès refusé' })
    }

    const entreprises = await Entreprise.all()
    return response.ok({ entreprises })
  }

  async createEntreprise({ request, response, auth }: HttpContext) {
    if (auth.user?.role !== 'admin') {
      return response.unauthorized({ message: 'Accès refusé' })
    }

    const payload = await request.validateUsing(createEntrepriseValidator)
    const entreprise = await Entreprise.create(payload)

    return response.created({ entreprise })
  }

  async updateEntreprise({ request, response, auth, params }: HttpContext) {
    if (auth.user?.role !== 'admin') {
      return response.unauthorized({ message: 'Accès refusé' })
    }

    const entreprise = await Entreprise.findOrFail(params.id)
    const payload = await request.validateUsing(updateEntrepriseValidator)

    entreprise.merge(payload)
    await entreprise.save()

    return response.ok({ entreprise })
  }

  async deleteEntreprise({ response, auth, params }: HttpContext) {
    if (auth.user?.role !== 'admin') {
      return response.unauthorized({ message: 'Accès refusé' })
    }

    const entreprise = await Entreprise.findOrFail(params.id)
    await entreprise.delete()

    return response.ok({ message: 'Entreprise supprimée avec succès' })
  }

  // ========== GESTION DES MENUS ==========
  
  async getMenus({ response, auth }: HttpContext) {
    if (auth.user?.role !== 'admin') {
      return response.unauthorized({ message: 'Accès refusé' })
    }

    const menus = await Menu.query()
      .preload('entreprises')
      .preload('produits', (query) => {
        query.select('id', 'nom', 'prix', 'imageUrl')
      })
    
    // Ajouter fullImageUrl à chaque menu et ses produits
    const menusWithImages = menus.map((menu: any) => ({
      ...menu.serialize(),
      imageUrl: menu.imageUrl 
        ? (() => {
            const cleanUrl = menu.imageUrl.split('&')[0].split('?')[0]
            return cleanUrl.startsWith('http') ? cleanUrl : `/uploads/menus/${cleanUrl}`
          })()
        : null,
      produits: menu.produits?.map((produit: any) => ({
        ...produit.serialize(),
        imageUrl: produit.imageUrl 
          ? (() => {
              const cleanUrl = produit.imageUrl.split('&')[0].split('?')[0]
              return cleanUrl.startsWith('http') ? cleanUrl : `/uploads/produits/${cleanUrl}`
            })()
          : null,
        pivot: {
          quantite: produit.$extras.pivot_quantite || 1,
          ordre: produit.$extras.pivot_ordre || null,
          disponible: produit.$extras.pivot_disponible ?? true,
        },
      })) || [],
    }))
    
    return response.ok({ menus: menusWithImages })
  }

  async createMenu({ request, response, auth }: HttpContext) {
    if (auth.user?.role !== 'admin') {
      return response.unauthorized({ message: 'Accès refusé' })
    }

    const payload = await request.validateUsing(createMenuValidator)
    const { entrepriseIds, ...menuData } = payload

    const menu = await Menu.create(menuData)

    if (entrepriseIds && entrepriseIds.length > 0) {
      await menu.related('entreprises').sync(entrepriseIds)
    }

    await menu.load('entreprises')
    
    // Retourner le menu avec l'URL d'image formatée
    const menuWithImage = {
      ...menu.serialize(),
      imageUrl: menu.imageUrl 
        ? (() => {
            const cleanUrl = menu.imageUrl.split('&')[0].split('?')[0]
            return cleanUrl.startsWith('http') ? cleanUrl : `/uploads/menus/${cleanUrl}`
          })()
        : null,
    }
    
    return response.created({ menu: menuWithImage })
  }

  async updateMenu({ request, response, auth, params }: HttpContext) {
    if (auth.user?.role !== 'admin') {
      return response.unauthorized({ message: 'Accès refusé' })
    }

    const menu = await Menu.findOrFail(params.id)
    const payload = await request.validateUsing(updateMenuValidator)
    const { entrepriseIds, ...menuData } = payload

    menu.merge(menuData)
    await menu.save()

    if (entrepriseIds !== undefined) {
      await menu.related('entreprises').sync(entrepriseIds)
    }

    await menu.load('entreprises')
    
    // Retourner le menu avec l'URL d'image formatée
    const menuWithImage = {
      ...menu.serialize(),
      imageUrl: menu.imageUrl 
        ? (() => {
            const cleanUrl = menu.imageUrl.split('&')[0].split('?')[0]
            return cleanUrl.startsWith('http') ? cleanUrl : `/uploads/menus/${cleanUrl}`
          })()
        : null,
    }
    
    return response.ok({ menu: menuWithImage })
  }

  async deleteMenu({ response, auth, params }: HttpContext) {
    if (auth.user?.role !== 'admin') {
      return response.unauthorized({ message: 'Accès refusé' })
    }

    const menu = await Menu.findOrFail(params.id)
    await menu.delete()

    return response.ok({ message: 'Menu supprimé avec succès' })
  }

  // ========== GESTION DES PRODUITS ==========
  
  async getProduits({ response, auth }: HttpContext) {
    if (auth.user?.role !== 'admin') {
      return response.unauthorized({ message: 'Accès refusé' })
    }

    const produits = await Produit.query().preload('entreprises')
    
    // Ajouter fullImageUrl à chaque produit
    const produitsWithImages = produits.map((produit: any) => ({
      ...produit.serialize(),
      imageUrl: produit.imageUrl 
        ? (() => {
            const cleanUrl = produit.imageUrl.split('&')[0].split('?')[0]
            return cleanUrl.startsWith('http') ? cleanUrl : `/uploads/produits/${cleanUrl}`
          })()
        : null,
    }))
    
    return response.ok({ produits: produitsWithImages })
  }

  async createProduit({ request, response, auth }: HttpContext) {
    if (auth.user?.role !== 'admin') {
      return response.unauthorized({ message: 'Accès refusé' })
    }

    const payload = await request.validateUsing(createProduitValidator)
    const { entrepriseIds, ...produitData } = payload

    const produit = await Produit.create(produitData)

    if (entrepriseIds && entrepriseIds.length > 0) {
      await produit.related('entreprises').sync(entrepriseIds)
    }

    await produit.load('entreprises')
    
    // Retourner le produit avec l'URL d'image formatée
    const produitWithImage = {
      ...produit.serialize(),
      imageUrl: produit.imageUrl 
        ? (() => {
            const cleanUrl = produit.imageUrl.split('&')[0].split('?')[0]
            return cleanUrl.startsWith('http') ? cleanUrl : `/uploads/produits/${cleanUrl}`
          })()
        : null,
    }
    
    return response.created({ produit: produitWithImage })
  }

  async updateProduit({ request, response, auth, params }: HttpContext) {
    if (auth.user?.role !== 'admin') {
      return response.unauthorized({ message: 'Accès refusé' })
    }

    const produit = await Produit.findOrFail(params.id)
    const payload = await request.validateUsing(updateProduitValidator)
    const { entrepriseIds, ...produitData } = payload

    produit.merge(produitData)
    await produit.save()

    if (entrepriseIds !== undefined) {
      await produit.related('entreprises').sync(entrepriseIds)
    }

    await produit.load('entreprises')
    
    // Retourner le produit avec l'URL d'image formatée
    const produitWithImage = {
      ...produit.serialize(),
      imageUrl: produit.imageUrl 
        ? (() => {
            const cleanUrl = produit.imageUrl.split('&')[0].split('?')[0]
            return cleanUrl.startsWith('http') ? cleanUrl : `/uploads/produits/${cleanUrl}`
          })()
        : null,
    }
    
    return response.ok({ produit: produitWithImage })
  }

  async deleteProduit({ response, auth, params }: HttpContext) {
    if (auth.user?.role !== 'admin') {
      return response.unauthorized({ message: 'Accès refusé' })
    }

    const produit = await Produit.findOrFail(params.id)
    await produit.delete()

    return response.ok({ message: 'Produit supprimé avec succès' })
  }

  // ========== GESTION DES RELATIONS MENU-PRODUITS ==========
  
  async getMenuProduits({ response, auth, params }: HttpContext) {
    if (auth.user?.role !== 'admin') {
      return response.unauthorized({ message: 'Accès refusé' })
    }

    try {
      const menu = await Menu.findOrFail(params.id)
      
      await menu.load('produits', (query) => {
        query.select('id', 'nom', 'prix', 'imageUrl', 'active')
          .orderBy('pivot_ordre', 'asc')
      })

      // Formater les produits avec les URLs d'images et les données pivot
      const produits = menu.produits.map((produit: any) => ({
        ...produit.serialize(),
        imageUrl: produit.imageUrl 
          ? (() => {
              const cleanUrl = produit.imageUrl.split('&')[0].split('?')[0]
              return cleanUrl.startsWith('http') ? cleanUrl : `/uploads/produits/${cleanUrl}`
            })()
          : null,
        pivot: {
          quantite: produit.$extras.pivot_quantite || 1,
          ordre: produit.$extras.pivot_ordre || null,
          disponible: produit.$extras.pivot_disponible ?? true,
        },
      }))

      return response.ok({ produits })
    } catch (error) {
      return response.badRequest({
        message: 'Erreur lors de la récupération des produits du menu',
        error: error.message,
      })
    }
  }
}
