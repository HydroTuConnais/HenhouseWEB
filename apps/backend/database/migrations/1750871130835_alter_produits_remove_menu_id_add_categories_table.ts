import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'produits'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['menu_id'])
      table.dropColumn('menu_id')

      table.string('categorie').defaultTo('plat')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('menu_id').nullable()
      table.foreign('menu_id').references('id').inTable('menus').onDelete('SET NULL')
      table.dropColumn('categorie')
    })
  }
}
