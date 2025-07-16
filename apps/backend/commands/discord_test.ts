import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import DiscordService from '#services/discord_service'

export default class DiscordTest extends BaseCommand {
  static commandName = 'discord:test'
  static description = 'Test la connexion et l\'envoi de notification Discord'

  static options: CommandOptions = {
    startApp: true,
    allowUnknownFlags: false,
    staysAlive: false,
  }

  async run() {
    try {
      this.logger.info('🧪 Test Discord en cours...')

      // Données de test
      const testData = {
        id: 999,
        statut: 'en_attente' as const,
        total: 25.50,
        date_commande: new Date().toISOString(),
        user: {
          email: 'test@exemple.com',
          prenom: 'John',
          nom: 'Doe'
        },
        entreprise: {
          nom: 'Restaurant Test'
        },
        produits: [
          {
            nom: 'Pizza Margherita',
            quantite: 2,
            prix_unitaire: 12.50
          },
          {
            nom: 'Coca Cola',
            quantite: 1,
            prix_unitaire: 2.50
          }
        ]
      }

      // Test notification
      await DiscordService.notifyNewCommande(testData)
      
      this.logger.success('✅ Notification Discord de test envoyée avec succès!')
      this.logger.info('📱 Vérifiez votre canal Discord pour voir le message')
      
    } catch (error) {
      this.logger.error('❌ Erreur lors du test Discord:', error)
      this.exitCode = 1
    }
  }
}
