import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('username').notNullable().unique()
      table.string('password').notNullable()
      table.enum('role', ['entreprise', 'admin']).notNullable()
      table.integer('entreprise_id').unsigned().references('entreprises.id').onDelete('CASCADE')
      table.boolean('active').defaultTo(true)
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
