import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'commandes'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.enum('type_livraison', ['livraison', 'click_and_collect']).defaultTo('livraison')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('type_livraison')
    })
  }
}