import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'

// Routes d'authentification
router.group(() => {
  router.post('/register', '#controllers/http/authcontroller.register')
  router.post('/login', '#controllers/http/authcontroller.login')
  router.post('/logout', '#controllers/http/authcontroller.logout').use(middleware.auth())
  router.get('/me', '#controllers/http/authcontroller.me').use(middleware.auth())
}).prefix('/auth')

// Routes protégées
router.group(() => {
  // Menus
  router.get('/menus', '#controllers/http/menuscontroller.index')
  router.get('/menus/:id', '#controllers/http/menuscontroller.show')
  router.post('/menus', '#controllers/http/menuscontroller.store')
  router.put('/menus/:id', '#controllers/http/menuscontroller.update')
  router.delete('/menus/:id', '#controllers/http/menuscontroller.destroy')
  
  // Commandes
  router.get('/commandes', '#controllers/http/commandescontroller.index')
  router.get('/commandes/:id', '#controllers/http/commandescontroller.show')
  router.post('/commandes', '#controllers/http/commandescontroller.store')
  router.patch('/commandes/:id/statut', '#controllers/http/commandescontroller.updateStatut')

  // Uploads
  router.post('/upload/menu', '#controllers/http/uploadcontroller.uploadMenu')
  router.post('/upload/produit', '#controllers/http/uploadcontroller.uploadProduit')
}).prefix('/api').use(middleware.auth())
