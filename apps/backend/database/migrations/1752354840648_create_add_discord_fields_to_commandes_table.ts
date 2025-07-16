import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'commandes'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('claimed_by').nullable() // Discord username de qui a claim la commande
      table.datetime('claimed_at').nullable() // Moment où la commande a été claim
      table.string('discord_message_id').nullable() // ID du message Discord pour les interactions
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('claimed_by')
      table.dropColumn('claimed_at')
      table.dropColumn('discord_message_id')
    })
  }
}