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

    // Commandes
    router.get('/commandes', '#controllers/http/commandes_controller.index')
    router.get('/commandes/:id', '#controllers/http/commandes_controller.show')
    router.post('/commandes', '#controllers/http/commandes_controller.store')
    router.patch('/commandes/:id/statut', '#controllers/http/commandes_controller.updateStatut')

    // Uploads
    router.post('/upload/menu', '#controllers/http/upload_controller.uploadMenu')
    router.post('/upload/produit', '#controllers/http/upload_controller.uploadProduit')
  })
  .prefix('/api')
  .use(middleware.auth())
