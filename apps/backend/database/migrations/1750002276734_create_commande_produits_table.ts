import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'commande_produits'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('commande_id').unsigned().references('commandes.id').onDelete('CASCADE')
      table.integer('produit_id').unsigned().references('produits.id').onDelete('CASCADE')
      table.integer('quantite').notNullable().defaultTo(1)
      table.decimal('prix_unitaire', 8, 2).notNullable()
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
