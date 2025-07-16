import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'commandes'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Supprimer les contraintes foreign key existantes
      table.dropForeign(['user_id'])
      table.dropForeign(['entreprise_id'])
      
      // Rendre les colonnes nullable
      table.integer('user_id').unsigned().nullable().alter()
      table.integer('entreprise_id').unsigned().nullable().alter()
      
      // Rétablir les contraintes foreign key avec nullable
      table.foreign('user_id').references('users.id').onDelete('SET NULL')
      table.foreign('entreprise_id').references('entreprises.id').onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      // Supprimer les contraintes foreign key
      table.dropForeign(['user_id'])
      table.dropForeign(['entreprise_id'])
      
      // Remettre les colonnes non-nullable
      table.integer('user_id').unsigned().notNullable().alter()
      table.integer('entreprise_id').unsigned().notNullable().alter()
      
      // Rétablir les contraintes foreign key originales
      table.foreign('user_id').references('users.id').onDelete('CASCADE')
      table.foreign('entreprise_id').references('entreprises.id').onDelete('CASCADE')
    })
  }
}