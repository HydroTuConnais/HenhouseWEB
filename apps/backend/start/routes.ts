import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'

// Routes d'authentification
router
  .group(() => {
    router.post('/register', '#controllers/http/auth_controller.register')
    router.post('/login', '#controllers/http/auth_controller.login')
    router.post('/logout', '#controllers/http/auth_controller.logout').use(middleware.auth())
    router.get('/me', '#controllers/http/auth_controller.me').use(middleware.auth())
  })
  .prefix('/auth')

// Routes protégées
router
  .group(() => {
    // Menus
    router.get('/menus', '#controllers/http/menu_controller.index')
    router.get('/menus/:id', '#controllers/http/menu_controller.show')
    router.post('/menus', '#controllers/http/menu_controller.store')
    router.put('/menus/:id', '#controllers/http/menu_controller.update')
    router.delete('/menus/:id', '#controllers/http/menu_controller.destroy')
    router.post('/menus/:id/image', '#controllers/http/menu_controller.uploadImage')

    // Commandes
    router.get('/commandes', '#controllers/http/commandes_controller.index')
    router.get('/commandes/:id', '#controllers/http/commandes_controller.show')
    router.post('/commandes', '#controllers/http/commandes_controller.store')
    router.patch('/commandes/:id/statut', '#controllers/http/commandes_controller.updateStatut')

    // Produits
    router.get('/produits', '#controllers/http/produits_controller.index')
    router.get('/produits/:id', '#controllers/http/produits_controller.show')
    router.post('/produits', '#controllers/http/produits_controller.store')
    router.put('/produits/:id', '#controllers/http/produits_controller.update')
    router.delete('/produits/:id', '#controllers/http/produits_controller.destroy')
    router.post('/produits/:id/image', '#controllers/http/produits_controller.uploadImage')

    // Entreprises
    router.get('/entreprises', '#controllers/http/entreprise_controller.index')
    router.get('/entreprises/:id', '#controllers/http/entreprise_controller.show')
    router.post('/entreprises', '#controllers/http/entreprise_controller.store')
    router.put('/entreprises/:id', '#controllers/http/entreprise_controller.update')
    router.delete('/entreprises/:id', '#controllers/http/entreprise_controller.destroy')

    router.get('/entreprises/:id/menus', '#controllers/http/entreprise_controller.getMenus')
    router.post('/entreprises/:id/menus', '#controllers/http/entreprise_controller.associateMenus')
    router.get('/entreprises/:id/commandes', '#controllers/http/entreprise_controller.getCommandes')

    // Uploads
    router.post('/upload/menu', '#controllers/http/upload_controller.uploadMenu')
    router.post('/upload/produit', '#controllers/http/upload_controller.uploadProduit')
  })
  .prefix('/api')
  .use(middleware.auth())
