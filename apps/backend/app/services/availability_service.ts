import EmployeeService from '#models/employee_service'
import env from '#start/env'
import logger from '@adonisjs/core/services/logger'

class AvailabilityService {
  private static instance: AvailabilityService | null = null
  private cache: Map<string, boolean> = new Map()
  private cacheExpirationTime: number = 30000 // 30 secondes

  constructor() {
    // Nettoyer le cache périodiquement
    setInterval(() => {
      this.clearExpiredCache()
    }, this.cacheExpirationTime)
  }

  static getInstance(): AvailabilityService {
    if (!AvailabilityService.instance) {
      AvailabilityService.instance = new AvailabilityService()
    }
    return AvailabilityService.instance
  }

  /**
   * Vérifie si le système de vérification des employés est activé
   */
  private isEmployeeCheckEnabled(): boolean {
    return env.get('REQUIRE_EMPLOYEES_FOR_ORDERS', 'true') === 'true'
  }

  /**
   * Vérifie si des employés sont disponibles pour traiter les commandes
   */
  async areEmployeesAvailable(): Promise<boolean> {
    // Si la vérification est désactivée, toujours retourner true
    if (!this.isEmployeeCheckEnabled()) {
      return true
    }

    // Vérifier le cache d'abord
    const cacheKey = 'employees_available'
    const cached = this.cache.get(cacheKey)
    if (cached !== undefined) {
      return cached
    }

    try {
      const available = await EmployeeService.areEmployeesAvailable()
      
      // Mettre en cache le résultat
      this.cache.set(cacheKey, available)
      
      // Programmer l'expiration du cache
      setTimeout(() => {
        this.cache.delete(cacheKey)
      }, this.cacheExpirationTime)

      return available
    } catch (error) {
      logger.error('Erreur lors de la vérification de la disponibilité des employés:', error)
      // En cas d'erreur, on permet les commandes par défaut
      return true
    }
  }

  /**
   * Retourne le nombre d'employés actuellement en service
   */
  async getActiveEmployeesCount(): Promise<number> {
    try {
      return await EmployeeService.getActiveEmployeesCount()
    } catch (error) {
      logger.error('Erreur lors du comptage des employés actifs:', error)
      return 0
    }
  }

  /**
   * Retourne la liste des employés actuellement en service
   */
  async getActiveEmployees() {
    try {
      return await EmployeeService.getActiveEmployees()
    } catch (error) {
      logger.error('Erreur lors de la récupération des employés actifs:', error)
      return []
    }
  }

  /**
   * Ajoute un employé en service
   */
  async addEmployeeToService(discordUserId: string, username: string) {
    try {
      const service = await EmployeeService.startService(discordUserId, username)
      
      // Invalider le cache
      this.clearCache()
      
      logger.info(`Employé ${username} (${discordUserId}) a commencé son service`)
      return service
    } catch (error) {
      logger.error(`Erreur lors de l'ajout de l'employé ${username} en service:`, error)
      throw error
    }
  }

  /**
   * Retire un employé du service
   */
  async removeEmployeeFromService(discordUserId: string) {
    try {
      const service = await EmployeeService.endService(discordUserId)
      
      // Invalider le cache
      this.clearCache()
      
      if (service) {
        logger.info(`Employé ${service.username} (${discordUserId}) a terminé son service`)
      }
      
      return service
    } catch (error) {
      logger.error(`Erreur lors de la suppression de l'employé ${discordUserId} du service:`, error)
      throw error
    }
  }

  /**
   * Invalide tout le cache
   */
  private clearCache(): void {
    this.cache.clear()
  }

  /**
   * Nettoie les entrées de cache expirées
   */
  private clearExpiredCache(): void {
    // Le cache est géré automatiquement avec setTimeout
    // Cette méthode est gardée pour une éventuelle extension future
  }

  /**
   * Retourne un message d'erreur approprié quand aucun employé n'est disponible
   */
  getUnavailabilityMessage(): { message: string; error: string } {
    return {
      message: "Service temporairement indisponible. Aucun employé n'est actuellement en service.",
      error: "NO_EMPLOYEES_AVAILABLE"
    }
  }
}

export default AvailabilityService.getInstance()