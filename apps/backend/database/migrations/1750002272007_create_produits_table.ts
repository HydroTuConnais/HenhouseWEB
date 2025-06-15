import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'produits'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('nom').notNullable()
      table.text('description').nullable()
      table.decimal('prix', 8, 2).notNullable()
      table.integer('menu_id').unsigned().references('menus.id').onDelete('CASCADE')
      table.boolean('active').defaultTo(true)
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
