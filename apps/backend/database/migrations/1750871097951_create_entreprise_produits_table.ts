import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'entreprise_produits'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('entreprise_id')
        .unsigned()
        .references('id')
        .inTable('entreprises')
        .onDelete('CASCADE')
      table
        .integer('produit_id')
        .unsigned()
        .references('id')
        .inTable('produits')
        .onDelete('CASCADE')
      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.unique(['entreprise_id', 'produit_id'])

      table.index(['entreprise_id'])
      table.index(['produit_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
