import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'employee_services'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('discord_user_id').notNullable()
      table.string('username').notNullable()
      table.timestamp('start_time').notNullable()
      table.boolean('is_active').defaultTo(true).notNullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')

      // Index pour améliorer les performances de recherche
      table.index(['discord_user_id', 'is_active'])
      table.index(['is_active'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}