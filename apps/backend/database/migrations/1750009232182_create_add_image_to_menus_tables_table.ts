import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'menus'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('image_url').nullable()
      table.string('image_path').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('image_url')
      table.dropColumn('image_path')
    })
  }
}
