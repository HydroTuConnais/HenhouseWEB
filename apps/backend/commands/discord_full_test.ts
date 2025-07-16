import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import DiscordService from '#services/discord_service'

export default class DiscordFullTest extends BaseCommand {
  static commandName = 'discord:full-test'
  static description = 'Test complet de toutes les notifications Discord'

  static options: CommandOptions = {
    startApp: true,
    allowUnknownFlags: false,
    staysAlive: false,
  }

  async run() {
    try {
      this.logger.info('🧪 Test complet des notifications Discord...')

      // Test 1: Nouvelle commande
      this.logger.info('📝 Test 1: Nouvelle commande')
      const nouvelleCommande = {
        id: 1001,
        statut: 'en_attente' as const,
        total: 45.50,
        date_commande: new Date().toISOString(),
        user: {
          email: 'client@test.com',
          prenom: 'Marie',
          nom: 'Dupont'
        },
        entreprise: {
          nom: 'Pizzeria da Luigi'
        },
        produits: [
          {
            nom: 'Pizza Quattro Stagioni',
            quantite: 2,
            prix_unitaire: 18.50
          },
          {
            nom: 'Tiramisu',
            quantite: 2,
            prix_unitaire: 4.25
          }
        ]
      }

      await DiscordService.notifyNewCommande(nouvelleCommande)
      this.logger.success('✅ Test nouvelle commande terminé')

      // Attendre un peu entre les tests
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Test 2: Mise à jour de statut  
      this.logger.info('📝 Test 2: Mise à jour de statut')
      const commandeModifiee = {
        ...nouvelleCommande,
        statut: 'confirmee' as const
      }

      await DiscordService.notifyCommandeUpdate(commandeModifiee, 'en_attente')
      this.logger.success('✅ Test mise à jour de statut terminé')

      // Attendre un peu
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Test 3: Commande annulée
      this.logger.info('📝 Test 3: Commande annulée')
      const commandeAnnulee = {
        ...nouvelleCommande,
        statut: 'annulee' as const
      }

      await DiscordService.notifyCommandeCancelled(commandeAnnulee)
      this.logger.success('✅ Test commande annulée terminé')

      this.logger.success('🎉 Tous les tests Discord réussis !')
      this.logger.info('📱 Vérifiez votre canal Discord pour voir tous les messages')

    } catch (error) {
      this.logger.error('❌ Erreur lors des tests Discord:', error)
      this.exitCode = 1
    }
  }
}
