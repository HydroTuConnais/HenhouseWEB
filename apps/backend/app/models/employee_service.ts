import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class EmployeeService extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare discordUserId: string

  @column()
  declare username: string

  @column.dateTime()
  declare startTime: DateTime

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  /**
   * Méthodes statiques pour gérer les employés en service
   */
  static async getActiveEmployees() {
    return this.query().where('isActive', true)
  }

  static async getActiveEmployeesCount(): Promise<number> {
    const result = await this.query().where('isActive', true).count('* as total')
    return Number(result[0].$extras.total)
  }

  static async startService(discordUserId: string, username: string) {
    // Vérifier si l'employé a déjà une session active
    const existingService = await this.query()
      .where('discordUserId', discordUserId)
      .where('isActive', true)
      .first()

    if (existingService) {
      // Mettre à jour la session existante
      existingService.startTime = DateTime.now()
      existingService.username = username
      await existingService.save()
      return existingService
    }

    // Créer une nouvelle session
    return this.create({
      discordUserId,
      username,
      startTime: DateTime.now(),
      isActive: true
    })
  }

  static async endService(discordUserId: string) {
    const service = await this.query()
      .where('discordUserId', discordUserId)
      .where('isActive', true)
      .first()

    if (service) {
      service.isActive = false
      await service.save()
      return service
    }

    return null
  }

  static async areEmployeesAvailable(): Promise<boolean> {
    const count = await this.getActiveEmployeesCount()
    return count > 0
  }
}