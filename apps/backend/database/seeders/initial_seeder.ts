import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Entreprise from '#models/entreprise'
import Menu from '#models/menu'
import Produit from '#models/produit'
import User from '#models/user'

export default class extends BaseSeeder {
  async run() {
    // Créer des entreprises
    const entreprise1 = await Entreprise.create({
      nom: 'Restaurant Le Gourmet',
    })

    const entreprise2 = await Entreprise.create({
      nom: 'Pizzeria Bella Vista',
    })

    // Créer des utilisateurs
    await User.create({
      username: 'admin',
      password: 'password123',
      role: 'admin',
      entrepriseId: null,
    })

    await User.create({
      username: 'manager_gourmet',
      password: 'password123',
      role: 'entreprise',
      entrepriseId: entreprise1.id,
    })

    // Créer des produits
    const produit1 = await Produit.create({
      nom: 'Burger Classic',
      description: 'Bœuf, cheddar, salade, tomate, sauce maison',
      prix: 8.50,
      categorie: 'plat',
      active: true,
    })

    const produit2 = await Produit.create({
      nom: 'Pizza Margherita',
      description: 'Tomate, mozzarella, basilic frais',
      prix: 12.00,
      categorie: 'plat',
      active: true,
    })

    const produit3 = await Produit.create({
      nom: 'Coca-Cola',
      description: 'Boisson gazeuse 33cl',
      prix: 2.50,
      categorie: 'boisson',
      active: true,
    })

    const produit4 = await Produit.create({
      nom: 'Tiramisu',
      description: 'Dessert italien traditionnel',
      prix: 5.50,
      categorie: 'dessert',
      active: true,
    })

    const produit5 = await Produit.create({
      nom: 'Frites maison',
      description: 'Pommes de terre fraîches, cuites à la perfection',
      prix: 3.50,
      categorie: 'accompagnement',
      active: true,
    })

    // Créer des menus
    const menu1 = await Menu.create({
      nom: 'Menu Burger Deluxe',
      description: 'Burger + Frites + Boisson + Dessert',
      prix: 15.99,
      active: true,
    })

    const menu2 = await Menu.create({
      nom: 'Menu Pizza Complète',
      description: 'Pizza + Boisson + Dessert',
      prix: 18.50,
      active: true,
    })

    // Associer les produits aux entreprises
    await entreprise1.related('produits').attach([produit1.id, produit3.id, produit4.id, produit5.id])
    await entreprise2.related('produits').attach([produit2.id, produit3.id, produit4.id])

    // Associer les menus aux entreprises
    await entreprise1.related('menus').attach([menu1.id, menu2.id]) // L'entreprise 1 a maintenant les deux menus
    await entreprise2.related('menus').attach([menu2.id])

    // Créer des relations menu-produits pour les tests
    // Menu Burger Deluxe avec ses produits
    await menu1.related('produits').attach({
      [produit1.id]: { quantite: 1, ordre: 1, disponible: true }, // Burger
      [produit5.id]: { quantite: 1, ordre: 2, disponible: true }, // Frites
      [produit3.id]: { quantite: 1, ordre: 3, disponible: true }, // Coca-Cola
      [produit4.id]: { quantite: 1, ordre: 4, disponible: true }, // Tiramisu
    })

    // Menu Pizza Complète avec ses produits
    await menu2.related('produits').attach({
      [produit2.id]: { quantite: 1, ordre: 1, disponible: true }, // Pizza
      [produit3.id]: { quantite: 1, ordre: 2, disponible: true }, // Coca-Cola
      [produit4.id]: { quantite: 1, ordre: 3, disponible: true }, // Tiramisu
    })

    // Créer l'utilisateur Test User
    await User.create({
      username: 'Test User',
      password: 'password123',
      role: 'admin',
      entrepriseId: null,
    })

    console.log('✅ Données de test créées avec succès!')
    console.log('📊 Créé:')
    console.log(`   - 2 entreprises`)
    console.log(`   - 3 utilisateurs (admin, manager_gourmet, Test User)`)
    console.log(`   - 5 produits`)
    console.log(`   - 2 menus`)
    console.log(`   - Relations menu-produits configurées`)
    console.log('🔑 Utilisateurs de test:')
    console.log('   - admin / password123 (admin)')
    console.log('   - manager_gourmet / password123 (entreprise)')
    console.log('   - "Test User" / password123 (admin)')
    console.log('')
    console.log('🧪 Pour tester les relations menu-produits, utilisez:')
    console.log(`   - Menu ID: ${menu1.id} ou ${menu2.id}`)
    console.log(`   - Produit IDs: ${produit1.id}, ${produit2.id}, ${produit3.id}, ${produit4.id}, ${produit5.id}`)
    console.log('')
    console.log('🚀 Testez avec: GET /api/menus/1 ou GET /api/menus/1/produits')
  }
}