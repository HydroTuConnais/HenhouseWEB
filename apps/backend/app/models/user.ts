import { DateTime } from 'luxon'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import Hash from '@adonisjs/core/services/hash'
import Entreprise from './entreprise.js'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Commande from './commande.js'

const AuthFinder = withAuthFinder(() => Hash.use('scrypt'), {
  uids: ['username'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare username: string

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare role: 'entreprise' | 'admin'

  @column()
  declare entrepriseId: number

  @column()
  declare active: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations
  @belongsTo(() => Entreprise)
  declare entreprise: BelongsTo<typeof Entreprise>

  @hasMany(() => Commande)
  declare commandes: HasMany<typeof Commande>
}