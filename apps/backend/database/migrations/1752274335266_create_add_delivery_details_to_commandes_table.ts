import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'commandes'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('telephone_livraison').nullable()
      table.json('creneaux_livraison').nullable() // JSON des créneaux de livraison
      table.text('notes_commande').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('telephone_livraison')
      table.dropColumn('creneaux_livraison')
      table.dropColumn('notes_commande')
    })
  }
}