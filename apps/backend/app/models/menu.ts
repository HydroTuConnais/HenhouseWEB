import { BaseModel, column, manyToMany } from '@adonisjs/lucid/orm'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Entreprise from './entreprise.js'

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

  get fullImageUrl() {
    if (this.imageUrl) {
      return this.imageUrl.startsWith('http') ? this.imageUrl : `/uploads/menus/${this.imageUrl}`
    }
    return null
  }
}
