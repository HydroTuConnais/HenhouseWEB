import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'menu_produits'

  async up() {
    this.schema.createTable('menu_produits', (table) => {
      table.increments('id')
      table.integer('menu_id').unsigned().references('id').inTable('menus').onDelete('CASCADE')
      table.integer('produit_id').unsigned().references('id').inTable('produits').onDelete('CASCADE')
      table.integer('quantite')
      table.integer('ordre')
      table.boolean('disponible').defaultTo(true)
      table.timestamps(true)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}