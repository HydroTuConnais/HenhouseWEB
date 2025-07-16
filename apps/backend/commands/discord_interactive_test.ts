import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import DiscordService from '#services/discord_service'

export default class DiscordInteractiveTest extends BaseCommand {
  static commandName = 'discord:interactive-test'
  static description = 'Test les boutons interactifs Discord avec une fausse commande'

  static options: CommandOptions = {
    startApp: true,
    allowUnknownFlags: false,
    staysAlive: false,
  }

  async run() {
    this.logger.info('🧪 Test des boutons interactifs Discord...')

    try {
      // Créer une fausse commande pour test
      const fakeCommande = {
        id: 999,
        statut: 'en_attente',
        total: 25.50,
        date_commande: new Date().toISOString(),
        user: {
          email: 'test@example.com',
          prenom: 'Test',
          nom: 'User'
        },
        entreprise: {
          nom: 'Restaurant Test'
        },
        produits: [
          {
            nom: 'Burger Classic',
            quantite: 2,
            prix_unitaire: 8.50
          },
          {
            nom: 'Frites',
            quantite: 1,
            prix_unitaire: 3.50
          },
          {
            nom: 'Coca-Cola',
            quantite: 2,
            prix_unitaire: 2.50
          }
        ]
      }

      // Envoyer la notification avec boutons
      await DiscordService.notifyNewCommande(fakeCommande)

      this.logger.success('✅ Test des boutons interactifs envoyé!')
      this.logger.info('💡 Utilisez les boutons dans Discord pour tester les interactions')
      
    } catch (error) {
      this.logger.error('❌ Erreur lors du test:', error)
    }
  }
}
