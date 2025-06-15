// app/Models/Produit.ts
import { BaseModel, belongsTo, column, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Menu from './menu.js'
import Commande from './commande.js'

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
  declare menuId: number

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
  @belongsTo(() => Menu)
  declare menu: BelongsTo<typeof Menu>

  @manyToMany(() => Commande, {
    pivotTable: 'commande_produits',
    pivotColumns: ['quantite', 'prix_unitaire']
  })
  declare commandes: ManyToMany<typeof Commande>

  // Getters
  get fullImageUrl() {
    if (this.imageUrl) {
      return this.imageUrl.startsWith('http') 
        ? this.imageUrl 
        : `/uploads/produits/${this.imageUrl}`
    }
    return null
  }
}