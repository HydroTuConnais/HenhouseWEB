import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'entreprise_menus'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('entreprise_id').unsigned().references('entreprises.id').onDelete('CASCADE')
      table.integer('menu_id').unsigned().references('menus.id').onDelete('CASCADE')
      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.unique(['entreprise_id', 'menu_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
