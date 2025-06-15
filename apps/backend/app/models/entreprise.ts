import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import User from './user.js'
import type { HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import Menu from './menu.js'
import Commande from './commande.js'

export default class Entreprise extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare nom: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations

  @hasMany(() => User)
  declare users: HasMany<typeof User>

  @manyToMany(() => Menu, {
    pivotTable: 'entreprise_menus',
  })
  declare menus: ManyToMany<typeof Menu>

  @hasMany(() => Commande)
  declare commandes: HasMany<typeof Commande>
}
