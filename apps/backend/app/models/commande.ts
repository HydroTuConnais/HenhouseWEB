import { BaseModel, beforeCreate, belongsTo, column, manyToMany } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import User from './user.js'
import Entreprise from './entreprise.js'
import Produit from './produit.js'
import Menu from './menu.js'
import type { BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'

export default class Commande extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare numeroCommande: string

  @column()
  declare statut: 'en_attente' | 'confirmee' | 'en_preparation' | 'prete' | 'livree' | 'annulee'

  @column()
  declare typeLivraison: 'livraison' | 'click_and_collect'

  @column()
  declare total: number

  @column()
  declare userId: number | null

  @column()
  declare entrepriseId: number | null

  @column()
  declare telephoneLivraison: string | null

  @column()
  declare creneauxLivraison: any | null // JSON des créneaux

  @column()
  declare notesCommande: string | null

  @column()
  declare claimedBy: string | null // Discord username de qui a claim la commande

  @column.dateTime()
  declare claimedAt: DateTime | null // Moment où la commande a été claim

  @column()
  declare discordMessageId: string | null // ID du message Discord pour les interactions

  @column.dateTime()
  declare dateLivraison: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Entreprise)
  declare entreprise: BelongsTo<typeof Entreprise>

  @manyToMany(() => Produit, {
    pivotTable: 'commande_produits',
    pivotColumns: ['quantite', 'prix_unitaire'],
  })
  declare produits: ManyToMany<typeof Produit>

  @manyToMany(() => Menu, {
    pivotTable: 'commande_menus',
    pivotColumns: ['quantite', 'prix_unitaire'],
  })
  declare menus: ManyToMany<typeof Menu>

  @beforeCreate()
  static async generateNumero(commande: Commande) {
    const timestamp = Date.now()
    commande.numeroCommande = `CMD-${timestamp}`
  }
}
