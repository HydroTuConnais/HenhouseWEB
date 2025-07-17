import { BaseModel, column, manyToMany } from '@adonisjs/lucid/orm'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Entreprise from './entreprise.js'
import Produit from './produit.js'
import Commande from './commande.js'

export default class Menu extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare nom: string

  @column()
  declare description: string | null

  @column()
  declare prix: number

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

  @manyToMany(() => Entreprise, {
    pivotTable: 'entreprise_menus',
  })
  declare entreprises: ManyToMany<typeof Entreprise>

  @manyToMany(() => Produit, {
    pivotTable: 'menu_produits',
    pivotColumns: ['quantite', 'ordre', 'disponible'],
  })
  declare produits: ManyToMany<typeof Produit>

    @manyToMany(() => Commande, {
    pivotTable: 'commande_menus',
    pivotColumns: ['quantite', 'prix_unitaire'],
  })
  declare commandes: ManyToMany<typeof Commande>

  get fullImageUrl() {
    if (this.imageUrl) {
      // Supprimer les paramètres Next.js d'optimisation d'image (&w=640&q=75)
      const cleanUrl = this.imageUrl.split('&')[0].split('?')[0]
      return cleanUrl.startsWith('http') ? cleanUrl : `/uploads/menus/${cleanUrl}`
    }
    return null
  }
}
