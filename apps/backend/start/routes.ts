import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'

// Route pour servir les fichiers statiques (images)
router.get('/uploads/*', ({ request, response }) => {
  const filePath = request.param('*').join('/')
  return response.download(`public/uploads/${filePath}`)
})

// Routes d'authentification
router
  .group(() => {
    router.post('/register', '#controllers/http/auth_controller.register')
    router.post('/login', '#controllers/http/auth_controller.login')
    router.post('/logout', '#controllers/http/auth_controller.logout').use(middleware.auth())
    router.get('/me', '#controllers/http/auth_controller.me').use(middleware.auth())
    router.patch('/change-password', '#controllers/http/auth_controller.changePassword').use(middleware.auth())
  })
  .prefix('/auth')

// Routes publiques (menus et produits non liés à des entreprises)
router
  .group(() => {
    // Consultation publique des menus (non liés à des entreprises)
    router.get('/menus', '#controllers/http/menus_controller.indexPublic')
    router.get('/menus/:id', '#controllers/http/menus_controller.showPublic')
    router.get('/menus/:id/produits', '#controllers/http/menus_controller.getProduitsPublic')

    // Consultation publique des produits (non liés à des entreprises)
    router.get('/produits', '#controllers/http/produits_controller.indexPublic')
    router.get('/produits/:id', '#controllers/http/produits_controller.showPublic')

    // Routes publiques pour les commandes
    router.get('/commandes/entreprises', '#controllers/http/commandes_controller.getEntreprisesPublic')
    router.get('/commandes/entreprises/:id', '#controllers/http/commandes_controller.getEntreprisePublic')
    router.post('/commandes/public', '#controllers/http/commandes_controller.storePublic')
    router.get('/commandes/statut/:numero', '#controllers/http/commandes_controller.getStatutPublic')
  })
  .prefix('/api')

// Routes protégées (gestion/modification)
router
  .group(() => {
    // === CONSULTATION PROTÉGÉE ===
    // Liste des entreprises (admin uniquement)
    router.get('/entreprises', '#controllers/http/entreprise_controller.index')
    router.get('/entreprises/:id', '#controllers/http/entreprise_controller.show')

    // Consultation complète des menus (y compris liés aux entreprises)
    router.get('/menus/all', '#controllers/http/menus_controller.index')
    router.get('/menus/:id/details', '#controllers/http/menus_controller.show')

    // Consultation complète des produits (y compris liés aux entreprises)
    router.get('/produits/all', '#controllers/http/produits_controller.index')
    router.get('/produits/:id/details', '#controllers/http/produits_controller.show')

    // Consultation détaillée des entreprises (avec menus/produits)
    router.get('/entreprises/:id/menus', '#controllers/http/entreprise_controller.getMenus')
    router.get('/entreprises/:id/produits', '#controllers/http/entreprise_controller.getProduits')
    router.get('/entreprises/:id/catalogue', '#controllers/http/entreprise_controller.getMenusAndProduits')

    // === GESTION/MODIFICATION ===
    // Gestion des menus (création, modification, suppression)
    router.post('/menus', '#controllers/http/menus_controller.store')
    router.put('/menus/:id', '#controllers/http/menus_controller.update')
    router.delete('/menus/:id', '#controllers/http/menus_controller.destroy')
    router.post('/menus/:id/image', '#controllers/http/menus_controller.uploadImage')

    // Relations menus (gestion)
    router.get('/menus/:id/entreprises', '#controllers/http/menus_controller.getEntreprises')
    router.post('/menus/:id/entreprises', '#controllers/http/menus_controller.associateEntreprises')
    
    // Relations menus-produits (gestion)
    router.post('/menus/:id/produits', '#controllers/http/menus_controller.addProduit')
    router.put('/menus/:id/produits/:produitId', '#controllers/http/menus_controller.updateProduit')
    router.delete('/menus/:id/produits/:produitId', '#controllers/http/menus_controller.removeProduit')

    // Gestion des produits (création, modification, suppression)
    router.post('/produits', '#controllers/http/produits_controller.store')
    router.put('/produits/:id', '#controllers/http/produits_controller.update')
    router.delete('/produits/:id', '#controllers/http/produits_controller.destroy')
    router.post('/produits/:id/image', '#controllers/http/produits_controller.uploadImage')

    // Relations produits (gestion)
    router.get('/produits/:id/entreprises', '#controllers/http/produits_controller.getEntreprises')
    router.post('/produits/:id/entreprises', '#controllers/http/produits_controller.associateEntreprises')

    // Gestion des entreprises (création, modification, suppression)
    router.post('/entreprises', '#controllers/http/entreprise_controller.store')
    router.put('/entreprises/:id', '#controllers/http/entreprise_controller.update')
    router.delete('/entreprises/:id', '#controllers/http/entreprise_controller.destroy')

    // Relations entreprises (gestion)
    router.post('/entreprises/:id/menus', '#controllers/http/entreprise_controller.associateMenus')
    router.post('/entreprises/:id/produits', '#controllers/http/entreprise_controller.associateProduits')
    router.get('/entreprises/:id/commandes', '#controllers/http/entreprise_controller.getCommandes')

    // Commandes (nécessitent une authentification)
    router.get('/commandes', '#controllers/http/commandes_controller.index')
    router.get('/commandes/:id', '#controllers/http/commandes_controller.show')
    router.post('/commandes', '#controllers/http/commandes_controller.store')
    router.patch('/commandes/:id/statut', '#controllers/http/commandes_controller.updateStatus')

    // Uploads
    router.post('/upload/menu', '#controllers/http/upload_controller.uploadMenu')
    router.post('/upload/produit', '#controllers/http/upload_controller.uploadProduit')
  })
  .prefix('/api')
  .use(middleware.auth())

// Routes admin (admin uniquement)
router
  .group(() => {
    // Gestion des utilisateurs
    router.get('/users', '#controllers/http/admin_controller.getUsers')
    router.post('/users', '#controllers/http/admin_controller.createUser')
    router.put('/users/:id', '#controllers/http/admin_controller.updateUser')
    router.delete('/users/:id', '#controllers/http/admin_controller.deleteUser')

    // Gestion des entreprises (admin complet)
    router.get('/entreprises', '#controllers/http/admin_controller.getEntreprises')
    router.post('/entreprises', '#controllers/http/admin_controller.createEntreprise')
    router.put('/entreprises/:id', '#controllers/http/admin_controller.updateEntreprise')
    router.delete('/entreprises/:id', '#controllers/http/admin_controller.deleteEntreprise')

    // Gestion des menus (admin complet)
    router.get('/menus', '#controllers/http/admin_controller.getMenus')
    router.post('/menus', '#controllers/http/admin_controller.createMenu')
    router.put('/menus/:id', '#controllers/http/admin_controller.updateMenu')
    router.delete('/menus/:id', '#controllers/http/admin_controller.deleteMenu')
    router.get('/menus/:id/produits', '#controllers/http/admin_controller.getMenuProduits')

    // Gestion des produits (admin complet)
    router.get('/produits', '#controllers/http/admin_controller.getProduits')
    router.post('/produits', '#controllers/http/admin_controller.createProduit')
    router.put('/produits/:id', '#controllers/http/admin_controller.updateProduit')
    router.delete('/produits/:id', '#controllers/http/admin_controller.deleteProduit')
  })
  .prefix('/api/admin')
  .use(middleware.auth())
