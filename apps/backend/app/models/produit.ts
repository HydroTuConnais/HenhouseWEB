import { BaseModel, column, manyToMany } from '@adonisjs/lucid/orm'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Entreprise from './entreprise.js'
import Commande from './commande.js'
import Menu from './menu.js'

export default class Produit extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare nom: string

  @column()
  declare description: string | null

  @column()
  declare prix: number

  @column()
  declare categorie: string // plat, boisson, dessert, accompagnement

  @column()
  declare active: boolean

  @column()
  declare imageUrl: string | null

  @column()
  declare imagePath: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations
  @manyToMany(() => Entreprise, {
    pivotTable: 'entreprise_produits',
  })
  declare entreprises: ManyToMany<typeof Entreprise>

  @manyToMany(() => Menu, {
    pivotTable: 'menu_produits',
    pivotColumns: ['quantite', 'ordre', 'disponible'],
  })
  declare menus: ManyToMany<typeof Menu>

  @manyToMany(() => Commande, {
    pivotTable: 'commande_produits',
    pivotColumns: ['quantite', 'prix_unitaire'],
  })
  declare commandes: ManyToMany<typeof Commande>

  // Getters
  get fullImageUrl() {
    if (this.imageUrl) {
      // Supprimer les paramètres Next.js d'optimisation d'image
      const cleanUrl = this.imageUrl.split('?')[0].split('&')[0]
      return cleanUrl.startsWith('http') ? cleanUrl : `/uploads/produits/${cleanUrl}`
    }
    return null
  }
}
