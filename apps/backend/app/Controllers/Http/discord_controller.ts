import type { HttpContext } from '@adonisjs/core/http'
import DiscordService from '#services/discord_service'
import { DateTime } from 'luxon'

export default class DiscordController {
  /**
   * Teste la connexion Discord avec une notification simple
   */
  async test({ response }: HttpContext) {
    try {
      // Données de test
      const testData = {
        id: 999,
        statut: 'en_attente' as const,
        total: 25.50,
        date_commande: DateTime.now().toString(),
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

      await DiscordService.notifyNewCommande(testData)

      return response.ok({
        message: 'Notification Discord de test envoyée avec succès',
        data: testData
      })
    } catch (error) {
      return response.status(500).json({
        message: 'Erreur lors de l\'envoi de la notification Discord',
        error: error.message
      })
    }
  }
}
