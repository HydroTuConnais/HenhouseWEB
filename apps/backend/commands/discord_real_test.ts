import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import DiscordService from '#services/discord_service'
import Commande from '#models/commande'
import User from '#models/user'
import Entreprise from '#models/entreprise'
import Produit from '#models/produit'
import { DateTime } from 'luxon'

export default class DiscordRealTest extends BaseCommand {
  static commandName = 'discord:real-test'
  static description = 'Test les boutons interactifs Discord avec une vraie commande'

  static options: CommandOptions = {
    startApp: true,
    allowUnknownFlags: false,
    staysAlive: false,
  }

  async run() {
    this.logger.info('🧪 Test des boutons interactifs Discord avec une vraie commande...')

    try {
      // Trouver ou créer un utilisateur test
      let user = await User.findBy('username', 'test@discord.com')
      if (!user) {
        // Trouver une entreprise existante
        const entreprise = await Entreprise.first()
        if (!entreprise) {
          this.logger.error('❌ Aucune entreprise trouvée en base')
          return
        }

        user = await User.create({
          username: 'test@discord.com',
          password: 'password123',
          role: 'entreprise',
          entrepriseId: entreprise.id
        })
        this.logger.info(`✅ Utilisateur test créé: ${user.username}`)
      }

      // Trouver une entreprise
      const entreprise = await Entreprise.findOrFail(user.entrepriseId!)

      // Trouver quelques produits
      const produits = await Produit.query().limit(3)
      if (produits.length === 0) {
        this.logger.error('❌ Aucun produit trouvé en base')
        return
      }

      // Créer une commande test
      const commande = await Commande.create({
        statut: 'en_attente',
        total: 25.50,
        userId: user.id,
        entrepriseId: entreprise.id,
        dateLivraison: DateTime.now().plus({ hours: 2 }),
        notesCommande: 'Commande test pour Discord'
      })

      // Associer les produits à la commande
      for (let i = 0; i < Math.min(produits.length, 3); i++) {
        const produit = produits[i]
        await commande.related('produits').attach({
          [produit.id]: {
            quantite: i + 1,
            prix_unitaire: produit.prix
          }
        })
      }

      this.logger.info(`✅ Commande test créée: #${commande.numeroCommande} (ID: ${commande.id})`)

      // Préparer les données pour Discord
      const commandeData = {
        id: commande.id,
        statut: commande.statut,
        total: commande.total,
        date_commande: commande.createdAt.toString(),
        user: {
          email: user.username,
          prenom: undefined,
          nom: undefined
        },
        entreprise: {
          nom: entreprise.nom
        },
        produits: produits.slice(0, 3).map((p, i) => ({
          nom: p.nom,
          quantite: i + 1,
          prix_unitaire: p.prix
        }))
      }

      // Envoyer la notification avec boutons
      await DiscordService.notifyNewCommande(commandeData)

      this.logger.success('✅ Test avec vraie commande envoyé!')
      this.logger.info(`💡 Commande ID: ${commande.id}`)
      this.logger.info('💡 Utilisez les boutons dans Discord pour tester les interactions')
      
    } catch (error) {
      this.logger.error('❌ Erreur lors du test:', error)
      if (error instanceof Error) {
        this.logger.error(`   Message: ${error.message}`)
        this.logger.error(`   Stack: ${error.stack}`)
      }
    }
  }
}
