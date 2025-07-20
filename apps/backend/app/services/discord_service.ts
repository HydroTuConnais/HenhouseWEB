import { Client, GatewayIntentBits, EmbedBuilder, TextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle, ButtonInteraction } from 'discord.js'
import { DateTime } from 'luxon'
import env from '#start/env'
import logger from '@adonisjs/core/services/logger'

interface CommandeData {
  id: number
  numero_commande: string
  statut: string
  total: number
  date_commande: string
  creneaux_livraison?: any
  type_livraison?: string
  user: {
    email: string
    prenom?: string
    nom?: string
  }
  entreprise: {
    nom: string
  }
  produits: Array<{
    nom: string
    quantite: number
    prix_unitaire: number
  }>
}

class DiscordService {
  private static instance: DiscordService | null = null
  private client: Client | null = null
  private channelId: string | undefined  // Canal principal pour les livraisons
  private clickCollectChannelId: string | undefined  // Canal pour les click & collect
  private isConnected: boolean = false
  private readyPromise: Promise<void> | null = null
  private processedInteractions: Set<string> = new Set()
  private botId: string = Math.random().toString(36).substring(7)
  private regenerationInterval: NodeJS.Timeout | null = null
  private recentlyUpdatedMessages: Set<string> = new Set() // IDs des messages récemment modifiés
  private interactionTimestamps: Map<string, number> = new Map() // Timestamps des interactions

  constructor() {
    this.channelId = env.get('DISCORD_CHANNEL_ID')
    this.clickCollectChannelId = env.get('DISCORD_CLICK_COLLECT_CHANNEL_ID')
    const nodeEnv = env.get('NODE_ENV', 'development')
    logger.info(`🤖 Bot Discord instance créée avec ID: ${this.botId} (${nodeEnv})`)
    logger.info(`📋 Canal livraisons: ${this.channelId}`)
    logger.info(`🏪 Canal click & collect: ${this.clickCollectChannelId}`)
  }

  static getInstance(): DiscordService {
    if (!DiscordService.instance) {
      DiscordService.instance = new DiscordService()
    }
    return DiscordService.instance
  }

  /**
   * Initialise la connexion Discord
   */
  public async initialize(): Promise<void> {
    try {
      const token = env.get('DISCORD_BOT_TOKEN')
      
      if (!token) {
        logger.warn('Discord bot token not configured, Discord service disabled')
        return
      }

      if (!this.channelId && !this.clickCollectChannelId) {
        logger.warn('Aucun canal Discord configuré, service Discord désactivé')
        return
      }
      
      if (!this.channelId) {
        logger.warn('Canal livraisons Discord non configuré')
      }
      
      if (!this.clickCollectChannelId) {
        logger.warn('Canal click & collect Discord non configuré')
      }

      // Si déjà connecté, ne pas reconnecter
      if (this.client && this.isConnected) {
        logger.info('Discord bot déjà connecté')
        return
      }

      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
        ]
      })

      // Créer une promesse qui se résout quand le bot est prêt
      this.readyPromise = new Promise((resolve) => {
        this.client!.once('ready', () => {
          logger.info(`Discord bot connecté en tant que ${this.client?.user?.tag}`)
          this.isConnected = true
          resolve()
        })
      })

      // Gérer les interactions de boutons
      this.client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton()) return
        
        await this.handleButtonInteraction(interaction)
      })

      this.client.on('error', (error) => {
        logger.error('Erreur Discord:', error)
        this.isConnected = false
      })

      await this.client.login(token)
      
      // Attendre que le bot soit vraiment prêt
      await this.readyPromise
      
      // Régénérer les messages Discord pour les commandes en cours
      await this.regenerateActiveOrderMessages()
      
      // Optionnel : Régénération automatique toutes les 10 minutes
      this.startPeriodicRegeneration()
      
    } catch (error) {
      logger.error('Erreur lors de l\'initialisation du service Discord:', error)
    }
  }

  /**
   * Assure que le bot est prêt avant d'envoyer des messages
   */
  private async ensureReady(): Promise<boolean> {
    if (!this.client) {
      logger.info('🔄 Initialisation du client Discord...')
      await this.initialize()
      // Attendre un peu après l'initialisation
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    if (!this.isConnected) {
      logger.info('⏳ Attente de la connexion Discord...')
      if (this.readyPromise) {
        await this.readyPromise
      } else {
        // Réinitialiser si nécessaire
        await this.initialize()
      }
      // Attendre encore un peu pour être sûr
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    return this.isConnected && this.client !== null
  }

  /**
   * Envoie une notification de nouvelle commande
   */
  public async notifyNewCommande(commande: CommandeData): Promise<void> {
    const isReady = await this.ensureReady()
    if (!isReady) {
      logger.error('Impossible de connecter le bot Discord')
      return
    }

    try {
      const channel = await this.getChannelForCommande(commande)
      if (!channel) {
        logger.error('❌ Impossible de récupérer le canal Discord')
        return
      }

      const targetChannelId = commande.type_livraison === 'click_and_collect' 
        ? this.clickCollectChannelId 
        : this.channelId
      
      const embed = this.createCommandeEmbed(commande, '🆕 Nouvelle Commande', 0x00ff00)
      const buttons = this.createCommandeButtons(commande.id, commande.statut)
      
      const message = await channel.send({ 
        content: '<@&1264722214390075542>',
        embeds: [embed],
        components: buttons
      })

      // Sauvegarder l'ID du message Discord dans la commande
      try {
        const { default: Commande } = await import('#models/commande')
        const commandeModel = await Commande.find(commande.id)
        if (commandeModel) {
          commandeModel.discordMessageId = message.id
          await commandeModel.save()
        }
      } catch (dbError) {
        logger.error('Erreur lors de la sauvegarde de l\'ID du message Discord:', dbError)
      }
      
      logger.info(`Notification Discord envoyée - Message ID: ${message.id}`)
    } catch (error) {
      logger.error('Erreur lors de l\'envoi de la notification Discord:', error)
    }
  }

  /**
   * Envoie une notification de mise à jour de commande
   */
  public async notifyCommandeUpdate(commande: CommandeData, oldStatut: string): Promise<void> {
    if (!this.isReady()) return

    try {
      const channel = await this.getChannelForCommande(commande)
      if (!channel) return

      // Essayer de trouver le thread de la commande dans le bon canal
      const thread = await this.findOrCreateThread(commande.numero_commande, undefined, channel)
      
      if (thread) {
        // Envoyer dans le thread
        const actionEmbed = this.createActionEmbed('update', 'System', commande.numero_commande, commande.statut)
        await thread.send({ embeds: [actionEmbed] })
        logger.info(`Message de mise à jour envoyé dans le thread pour la commande #${commande.id}`)
      } else {
        // Fallback: envoyer dans le canal approprié
        const color = this.getStatusColor(commande.statut)
        const embed = this.createCommandeEmbed(
          commande, 
          `📝 Commande Mise à Jour (${oldStatut} → ${commande.statut})`, 
          color
        )
        
        await channel.send({ embeds: [embed] })
        logger.info(`Notification Discord de mise à jour envoyée pour la commande #${commande.id}`)
      }
      
    } catch (error) {
      logger.error('Erreur lors de l\'envoi de la notification de mise à jour Discord:', error)
    }
  }

  /**
   * Envoie une notification de commande annulée
   */
  public async notifyCommandeCancelled(commande: CommandeData): Promise<void> {
    if (!this.isReady()) return

    try {
      const channel = await this.getChannelForCommande(commande)
      if (!channel) return

      // Essayer de trouver le thread de la commande dans le bon canal
      const thread = await this.findOrCreateThread(commande.numero_commande, undefined, channel)
      
      if (thread) {
        // Envoyer dans le thread
        const cancelEmbed = this.createActionEmbed('cancel', 'System', commande.numero_commande, 'annulee')
        await thread.send({ embeds: [cancelEmbed] })
        logger.info(`Message d'annulation envoyé dans le thread pour la commande #${commande.id}`)
      } else {
        // Fallback: envoyer dans le canal approprié
        const embed = this.createCommandeEmbed(commande, '❌ Commande Annulée', 0xff0000)
        await channel.send({ embeds: [embed] })
        logger.info(`Notification Discord d'annulation envoyée pour la commande #${commande.id}`)
      }
      
    } catch (error) {
      logger.error('Erreur lors de l\'envoi de la notification d\'annulation Discord:', error)
    }
  }

  /**
   * Vérifie si le service Discord est prêt
   */
  private isReady(): boolean {
    if (!this.client || !this.isConnected) {
      logger.warn('Service Discord non disponible')
      return false
    }
    return true
  }

  /**
   * Détermine le canal approprié selon le type de livraison
   */
  private async getChannelForCommande(commande: CommandeData): Promise<TextChannel | null> {
    const targetChannelId = commande.type_livraison === 'click_and_collect' 
      ? this.clickCollectChannelId 
      : this.channelId
    
    return this.getChannelById(targetChannelId)
  }

  /**
   * Récupère le canal Discord par ID
   */
  private async getChannelById(channelId: string | undefined): Promise<TextChannel | null> {
    try {
      if (!channelId) {
        logger.error('ID du canal Discord non configuré')
        return null
      }

      if (!this.client) {
        logger.error('Client Discord non disponible')
        return null
      }

      const channel = await this.client.channels.fetch(channelId)
      
      if (!channel) {
        logger.error(`Canal Discord ${channelId} introuvable`)
        return null
      }

      if (!channel.isTextBased()) {
        logger.error(`Canal ${channelId} n'est pas textuel`)
        return null
      }
      return channel as TextChannel
    } catch (error) {
      logger.error('Erreur lors de la récupération du canal Discord:', error)
      return null
    }
  }

  /**
   * Récupère le canal Discord (méthode de compatibilité)
   */
  private async getChannel(): Promise<TextChannel | null> {
    return this.getChannelById(this.channelId)
  }

  /**
   * Convertit une valeur en number de manière sécurisée
   */
  private safeToNumber(value: any): number {
    if (typeof value === 'number') return value
    if (typeof value === 'string') return parseFloat(value) || 0
    if (value && typeof value.toString === 'function') return parseFloat(value.toString()) || 0
    return 0
  }

  /**
   * Crée un embed pour les actions de statut
   */
  private createActionEmbed(action: string, username: string, numeroCommande: string, newStatut: string, userId?: string): EmbedBuilder {
    let title = ''
    let description = ''
    let color = 0x0099ff

    switch (action) {
      case 'claim':
        title = '🙋‍♂️ Commande Claim & Confirmée'
        description = `Commande prise en charge et confirmée par **${username}**`
        color = 0x0099ff // Bleu
        break
      case 'prepare':
        title = '👨‍🍳 Mise en Préparation'
        description = `Commande mise en préparation par **${username}**`
        color = 0xffff00 // Jaune
        break
      case 'ready':
        title = '📦 Commande Prête'
        description = `Commande prête pour livraison par **${username}**`
        color = 0x9932cc // Violet
        break
      case 'deliver':
        title = '🚚 Commande Livrée'
        description = `Commande livrée avec succès par **${username}**`
        color = 0x00ff00 // Vert
        break
      case 'cancel':
        title = '❌ Commande Annulée'
        description = `Commande annulée par **${username}**`
        color = 0xff0000 // Rouge
        break
      case 'update':
        title = '📝 Mise à Jour Automatique'
        description = `Statut de la commande mis à jour automatiquement`
        color = 0x808080 // Gris
        break
      default:
        title = '📝 Action sur Commande'
        description = `Action "${action}" effectuée par **${username}**`
        color = 0x808080 // Gris
    }

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .addFields(
        { name: '📋 N° Commande', value: numeroCommande, inline: true },
        { name: '📊 Nouveau Statut', value: `${this.getStatusEmoji(newStatut)} ${newStatut.toUpperCase()}`, inline: true },
        { name: '👤 Par', value: userId ? `<@${userId}>` : username, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: 'HenhouseWEB - Suivi de commandes' })

    return embed
  }

  /**
   * Trouve ou crée un thread pour une commande donnée
   */
  private async findOrCreateThread(commandeNumero: string, messageId?: string, channel?: TextChannel): Promise<any> {
    try {
      const targetChannel = channel || await this.getChannel()
      if (!targetChannel) return null

      // Chercher thread existant
      let thread = null
      try {
        const activeThreads = await targetChannel.threads.fetchActive()
        const archivedThreads = await targetChannel.threads.fetchArchived()
        
        thread = activeThreads.threads.find(t => t.name.includes(commandeNumero)) ||
                archivedThreads.threads.find(t => t.name.includes(commandeNumero))
        
        if (thread) {
          return thread
        }
      } catch (error) {
        logger.error('Erreur récupération threads:', error)
      }

      // Créer nouveau thread si messageId fourni
      if (messageId) {
        try {
          const message = await targetChannel.messages.fetch(messageId)
          if (message) {
            thread = await message.startThread({
              name: `📋 Suivi Commande #${commandeNumero}`,
              autoArchiveDuration: 1440,
              reason: 'Suivi des actions sur la commande'
            })
          }
        } catch (threadError) {
          logger.error('Erreur création thread:', threadError.message)
        }
      }

      return thread
    } catch (error) {
      logger.error('Erreur findOrCreateThread:', error.message)
      return null
    }
  }

  /**
   * Crée un embed pour une commande
   */
  private createCommandeEmbed(commande: CommandeData, title: string, color: number, claimedBy?: string | null): EmbedBuilder {
    const userName = commande.user.prenom && commande.user.nom 
      ? `${commande.user.prenom} ${commande.user.nom}`
      : commande.user.email

    const produitsText = commande.produits.map(p => 
      `• ${p.nom} (x${p.quantite}) - ${(p.quantite * this.safeToNumber(p.prix_unitaire)).toFixed(2)}$`
    ).join('\n')

    // Formatage des créneaux de livraison
    let creneauxText = 'Non spécifié'
    if (commande.creneaux_livraison) {
      try {
        const creneaux = typeof commande.creneaux_livraison === 'string' 
          ? JSON.parse(commande.creneaux_livraison) 
          : commande.creneaux_livraison
        
        if (creneaux && typeof creneaux === 'object') {
          const parts = []
          if (creneaux.date) parts.push(`📅 ${creneaux.date}`)
          if (creneaux.heure_debut && creneaux.heure_fin) {
            parts.push(`🕐 ${creneaux.heure_debut} - ${creneaux.heure_fin}`)
          }
          if (parts.length > 0) {
            creneauxText = parts.join(' | ')
          }
        }
      } catch (error) {
        creneauxText = 'Format invalide'
      }
    }

    // Formatage du type de livraison
    const typeLivraisonEmoji = commande.type_livraison === 'livraison' ? '🚚' : '🏪'
    const typeLivraisonText = commande.type_livraison === 'livraison' ? 'Livraison' : 'Click & Collect'

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setColor(color)
      .addFields(
        { name: '🆔 ID', value: `#${commande.id}`, inline: true },
        { name: '📋 N° Commande', value: commande.numero_commande || 'N/A', inline: true },
        { name: '👤 Client', value: userName, inline: true },
        { name: '🏢 Entreprise', value: commande.entreprise.nom || 'Commande publique', inline: true },
        { name: '📊 Statut', value: this.getStatusEmoji(commande.statut) + ' ' + commande.statut, inline: true },
        { name: '💰 Total', value: `${this.safeToNumber(commande.total).toFixed(2)}$`, inline: true },
        { name: '📅 Date commande', value: new Date(commande.date_commande).toLocaleDateString('fr-FR'), inline: true },
        { name: `${typeLivraisonEmoji} Type`, value: typeLivraisonText, inline: true },
        { name: '🚚 Créneau livraison', value: creneauxText, inline: false }
      )

    // Ajouter le champ "Claim par" si applicable
    if (claimedBy) {
      embed.addFields({ name: '🙋‍♂️ Claim par', value: claimedBy, inline: true })
    }

    embed.addFields({ name: '🛍️ Produits', value: produitsText || 'Aucun produit', inline: false })
      .setTimestamp()
      .setFooter({ text: 'HenhouseWEB - Système de commandes' })

    return embed
  }

  /**
   * Retourne la couleur selon le statut
   */
  private getStatusColor(statut: string): number {
    switch (statut.toLowerCase()) {
      case 'en_attente':
        return 0xffa500 // Orange
      case 'confirmee':
        return 0x0099ff // Bleu
      case 'en_preparation':
        return 0xffff00 // Jaune
      case 'prete':
        return 0x9932cc // Violet
      case 'livree':
        return 0x00ff00 // Vert
      case 'annulee':
        return 0xff0000 // Rouge
      default:
        return 0x808080 // Gris
    }
  }

  /**
   * Crée les boutons pour gérer une commande
   */
  private createCommandeButtons(commandeId: number, statut: string): ActionRowBuilder<ButtonBuilder>[] {
    const row1 = new ActionRowBuilder<ButtonBuilder>()
    const row2 = new ActionRowBuilder<ButtonBuilder>()

    // Bouton Claim (seulement si en_attente) - confirme directement
    if (statut === 'en_attente') {
      row1.addComponents(
        new ButtonBuilder()
          .setCustomId(`claim_${commandeId}`)
          .setLabel('🙋‍♂️ Claim & Confirmer')
          .setStyle(ButtonStyle.Primary)
      )
    }

    // Boutons de progression selon le statut
    if (statut === 'confirmee' || statut === 'en_preparation') {
      row1.addComponents(
        new ButtonBuilder()
          .setCustomId(`prepare_${commandeId}`)
          .setLabel('👨‍🍳 En préparation')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(statut === 'en_preparation')
      )
    }

    if (statut === 'en_preparation' || statut === 'prete') {
      row2.addComponents(
        new ButtonBuilder()
          .setCustomId(`ready_${commandeId}`)
          .setLabel('📦 Prête')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(statut === 'prete')
      )
    }

    if (statut === 'prete') {
      row2.addComponents(
        new ButtonBuilder()
          .setCustomId(`deliver_${commandeId}`)
          .setLabel('🚚 Livrée')
          .setStyle(ButtonStyle.Success)
      )
    }

    // Bouton annuler (toujours disponible sauf si déjà annulée ou livrée)
    if (!['annulee', 'livree'].includes(statut)) {
      row2.addComponents(
        new ButtonBuilder()
          .setCustomId(`cancel_${commandeId}`)
          .setLabel('❌ Annuler')
          .setStyle(ButtonStyle.Danger)
      )
    }

    const rows = []
    if (row1.components.length > 0) rows.push(row1)
    if (row2.components.length > 0) rows.push(row2)
    
    return rows
  }

  /**
   * Gère les interactions de boutons
   */
  private async handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
    
    // Vérifications préliminaires
    const interactionAge = Date.now() - interaction.createdTimestamp
    
    // Vérifier si l'interaction a déjà été traitée
    if (interaction.deferred || interaction.replied) {
      return
    }
    
    // Éviter les doublons
    if (this.processedInteractions.has(interaction.id)) {
      return
    }
    
    // Vérifier le canal autorisé
    const allowedChannels = [this.channelId, this.clickCollectChannelId].filter(Boolean)
    if (!allowedChannels.includes(interaction.channelId)) {
      return
    }
    
    // Marquer comme en traitement
    this.processedInteractions.add(interaction.id)
    this.interactionTimestamps.set(interaction.id, Date.now())
    
    // Vérifier l'âge de l'interaction
    if (interactionAge > 0 && interactionAge > 10000) {
      this.processedInteractions.delete(interaction.id)
      return
    } else if (interactionAge < -10000) {
      this.processedInteractions.delete(interaction.id)
      return
    }
    
    try {
      // Déférer la réponse pour avoir plus de temps (15 min au lieu de 3s)
      try {
        await interaction.deferReply({ flags: 64 }) // Ephemeral
      } catch (deferError: any) {
        if (deferError.code === 10062 || deferError.code === 10008) {
          this.processedInteractions.delete(interaction.id)
          return
        } else {
          // Fallback: reply direct
          try {
            await interaction.reply({ content: '⏱️ Traitement...', flags: 64 })
          } catch (fallbackError) {
            logger.error(`Impossible de répondre:`, fallbackError)
            this.processedInteractions.delete(interaction.id)
            return
          }
        }
      }
      
      // Parser l'action et l'ID de commande
      const [action, commandeIdStr] = interaction.customId.split('_')
      const commandeId = parseInt(commandeIdStr)

      if (isNaN(commandeId)) {
        logger.error(`ID invalide: ${commandeIdStr}`)
        await interaction.editReply({ content: '❌ ID de commande invalide' })
        return
      }
      
      // Récupérer la commande
      const { default: Commande } = await import('#models/commande')
      const commande = await Commande.find(commandeId)
      
      if (!commande) {
        logger.error(`Commande #${commandeId} non trouvée`)
        await interaction.editReply({ content: `❌ Commande #${commandeId} non trouvée` })
        return
      }

      const oldStatut = commande.statut
      let newStatut = oldStatut


      // Déterminer le nouveau statut selon l'action
      switch (action) {
        case 'claim':
          if (commande.statut === 'en_attente') {
            commande.claimedBy = interaction.user.username
            commande.claimedAt = DateTime.now()
            newStatut = 'confirmee'
          } else if (commande.statut === 'confirmee' && commande.claimedBy) {
            newStatut = 'confirmee' // Réparation message Discord
          } else {
            await interaction.editReply({ 
              content: '❌ Cette commande ne peut plus être claim'
            })
            this.processedInteractions.delete(interaction.id)
            return
          }
          break

        case 'prepare':
          if (commande.statut === 'confirmee') {
            newStatut = 'en_preparation'
          } else if (commande.statut === 'en_preparation') {
            newStatut = 'en_preparation'
          } else {
            await interaction.editReply({ content: '❌ Cette commande ne peut pas être mise en préparation' })
            this.processedInteractions.delete(interaction.id)
            return
          }
          break

        case 'ready':
          if (commande.statut === 'en_preparation') {
            newStatut = 'prete'
          } else if (commande.statut === 'prete') {
            newStatut = 'prete'
          } else {
            await interaction.editReply({ content: '❌ Cette commande ne peut pas être marquée comme prête' })
            this.processedInteractions.delete(interaction.id)
            return
          }
          break

        case 'deliver':
          if (commande.statut === 'prete') {
            newStatut = 'livree'
          } else if (commande.statut === 'livree') {
            newStatut = 'livree'
          } else {
            await interaction.editReply({ content: '❌ Cette commande ne peut pas être marquée comme livrée' })
            this.processedInteractions.delete(interaction.id)
            return
          }
          break

        case 'cancel':
          if (!['annulee', 'livree'].includes(commande.statut)) {
            newStatut = 'annulee'
          } else if (commande.statut === 'annulee') {
            newStatut = 'annulee'
          } else {
            await interaction.editReply({ content: '❌ Cette commande ne peut pas être annulée' })
            this.processedInteractions.delete(interaction.id)
            return
          }
          break

        default:
          logger.error(`Action non reconnue: ${action}`)
          await interaction.editReply({ 
            content: '❌ Action non reconnue'
          })
          return
      }


      // Mettre à jour la commande seulement si le statut a changé
      if (oldStatut !== newStatut) {
        commande.statut = newStatut as any
        await commande.save()
      }

      // Recréer les données de commande et mettre à jour le message
      const { default: User } = await import('#models/user')
      const { default: Entreprise } = await import('#models/entreprise')
      const Database = (await import('@adonisjs/lucid/services/db')).default


      // Pour les commandes publiques, userId peut être null
      let user = null
      if (commande.userId) {
        user = await User.findOrFail(commande.userId)
      }
      
      const entreprise = commande.entrepriseId ? await Entreprise.findOrFail(commande.entrepriseId) : null
      
      const commandeProduits = await Database
        .from('commande_produits')
        .join('produits', 'commande_produits.produit_id', 'produits.id')
        .where('commande_produits.commande_id', commandeId)
        .select(
          'produits.nom',
          'commande_produits.quantite',
          'commande_produits.prix_unitaire'
        )

      const commandeData: CommandeData = {
        id: commande.id,
        numero_commande: commande.numeroCommande,
        statut: newStatut, // Utiliser le NOUVEAU statut, pas l'ancien !
        total: this.safeToNumber(commande.total),
        date_commande: commande.createdAt.toString(),
        creneaux_livraison: commande.creneauxLivraison,
        type_livraison: commande.typeLivraison,
        user: {
          email: user ? user.username : commande.telephoneLivraison || 'Client anonyme',
          prenom: undefined,
          nom: undefined
        },
        entreprise: {
          nom: entreprise ? entreprise.nom : 'Commande publique'
        },
        produits: commandeProduits.map((p: any) => ({
          nom: p.nom,
          quantite: p.quantite,
          prix_unitaire: this.safeToNumber(p.prix_unitaire)
        }))
      }

      // Créer le nouvel embed et les nouveaux boutons SEULEMENT pour la mise à jour
      const statusTitle = `📊 Commande ${newStatut.toUpperCase()}`
      const statusColor = this.getStatusColor(newStatut)
      
      // Pour l'action claim, utiliser l'utilisateur actuel, sinon utiliser le claimedBy existant
      const displayClaimedBy = action === 'claim' ? interaction.user.username : commande.claimedBy


      // Mettre à jour SEULEMENT le message original (les boutons et le statut dans l'embed)
      const originalMessage = interaction.message
      
      if (originalMessage) {
        
        // S'assurer que l'embed reflète le nouveau statut et les informations de claim
        const updatedEmbed = this.createCommandeEmbed(
          commandeData, 
          statusTitle, 
          statusColor, 
          displayClaimedBy
        )
        
        // S'assurer que les boutons reflètent le nouveau statut
        const updatedButtons = this.createCommandeButtons(commandeId, newStatut)
        
        await originalMessage.edit({
          embeds: [updatedEmbed],
          components: updatedButtons
        })

        // Marquer ce message comme récemment modifié pour éviter la régénération
        this.recentlyUpdatedMessages.add(originalMessage.id)
        setTimeout(() => {
          this.recentlyUpdatedMessages.delete(originalMessage.id)
        }, 2 * 60 * 1000) // Protéger pendant 2 minutes

      }

      // Créer ou récupérer le thread associé au message et envoyer SEULEMENT le message dans le thread
      try {
        let thread = null

        if (originalMessage && originalMessage.id) {
          // Essayer de récupérer le thread existant de plusieurs façons
          try {
            const channel = originalMessage.channel
            
            if ('threads' in channel) {
              // Récupérer tous les threads (actifs ET archivés)
              const activeThreads = await channel.threads.fetchActive()
              const archivedThreads = await channel.threads.fetchArchived()
              
              // Chercher dans les threads actifs
              thread = activeThreads.threads.find(t => t.name.includes(commande.numeroCommande))
              
              // Si pas trouvé, chercher dans les threads archivés
              if (!thread) {
                thread = archivedThreads.threads.find(t => t.name.includes(commande.numeroCommande))
              }
            }
          } catch (error) {
            logger.error('Erreur lors de la récupération des threads:', error)
          }

          // Si aucun thread n'existe, en créer un SEULEMENT lors du premier claim
          if (!thread && action === 'claim') {
            try {
              const threadName = `📋 Suivi Commande #${commande.numeroCommande}`
              
              thread = await originalMessage.startThread({
                name: threadName,
                autoArchiveDuration: 1440, // 24 heures
                reason: 'Suivi des actions sur la commande'
              })
              logger.info(`Thread créé avec succès: ${thread.name} (ID: ${thread.id})`)
            } catch (threadError) {
              logger.error('Erreur lors de la création du thread:', threadError)
            }
          }

          // Envoyer SEULEMENT le message dans le thread, PAS dans le channel principal
          if (thread) {
            try {
              // Créer un embed pour l'action
              const actionEmbed = this.createActionEmbed(action, interaction.user.username, commande.numeroCommande, newStatut, interaction.user.id)
              await thread.send({ embeds: [actionEmbed] })
              logger.info(`Message envoyé dans le thread: ${thread.name}`)
            } catch (sendError) {
              logger.error('Erreur lors de l\'envoi du message dans le thread:', sendError)
            }
          }
        }
      } catch (threadError) {
        logger.error('Erreur générale lors de la gestion du thread:', threadError)
      }

      // Confirmer l'action à l'utilisateur
      const isRepair = oldStatut === newStatut
      const confirmMessage = isRepair 
        ? `🔧 Message Discord réparé pour la commande #${commande.numeroCommande} (statut: ${newStatut})`
        : `✅ Action "${action}" effectuée avec succès sur la commande #${commande.numeroCommande}`
      
      await interaction.editReply({ 
        content: confirmMessage
      })

      // Nettoyer l'interaction du cache après succès
      this.processedInteractions.delete(interaction.id)
      this.interactionTimestamps.delete(interaction.id)

    } catch (error) {
      // Nettoyer l'interaction du cache en cas d'erreur
      this.processedInteractions.delete(interaction.id)
      this.interactionTimestamps.delete(interaction.id)
      logger.error('Erreur lors de la gestion de l\'interaction:', error)
      
      if (error instanceof Error && (error.message.includes('10062') || error.message.includes('Unknown interaction'))) {
        const [action, commandeIdStr] = interaction.customId.split('_')
        const commandeId = parseInt(commandeIdStr)
        if (!isNaN(commandeId)) {
          await this.regenerateSpecificMessage(commandeId)
        }
      }
      
      try {
        if (interaction.deferred) {
          await interaction.editReply({ 
            content: '❌ Une erreur est survenue lors du traitement'
          })
        } else if (!interaction.replied) {
          await interaction.reply({ 
            content: '❌ Une erreur est survenue lors du traitement', 
            flags: 64 // MessageFlags.Ephemeral
          })
        }
      } catch (replyError) {
        logger.error('Erreur lors de la réponse d\'erreur:', replyError)
      }
    }
  }

  /**
   * Retourne l'emoji selon le statut
   */
  private getStatusEmoji(statut: string): string {
    switch (statut.toLowerCase()) {
      case 'en_attente':
        return '⏳'
      case 'confirmee':
        return '✅'
      case 'en_preparation':
        return '👨‍🍳'
      case 'prete':
        return '📦'
      case 'livree':
        return '🚚'
      case 'annulee':
        return '❌'
      default:
        return '❓'
    }
  }

  /**
   * Nettoie les interactions anciennes du cache
   */
  private cleanupOldInteractions(): void {
    const now = Date.now()
    const maxAge = 5 * 60 * 1000 // 5 minutes
    let cleanedCount = 0

    for (const [interactionId, timestamp] of this.interactionTimestamps.entries()) {
      if (now - timestamp > maxAge) {
        this.processedInteractions.delete(interactionId)
        this.interactionTimestamps.delete(interactionId)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      logger.info(`${cleanedCount} interaction(s) ancienne(s) nettoyée(s) du cache`)
    }
  }

  /**
   * Régénère les messages Discord pour toutes les commandes actives au redémarrage
   */
  public async regenerateActiveOrderMessages(): Promise<void> {
    // Nettoyer les interactions anciennes (plus de 5 minutes)
    this.cleanupOldInteractions()
    
    // Éviter la régénération si des interactions sont en cours de traitement
    if (this.processedInteractions.size > 0) {
      return
    }

    try {
      logger.info('Régénération des messages Discord pour les commandes actives...')
      
      // Importer les modèles nécessaires
      const { default: Commande } = await import('#models/commande')
      const { default: User } = await import('#models/user')
      const { default: Entreprise } = await import('#models/entreprise')
      const Database = (await import('@adonisjs/lucid/services/db')).default

      // Récupérer toutes les commandes non terminées (du plus petit au plus grand ID)
      const commandesActives = await Commande.query()
        .whereNotIn('statut', ['livree', 'annulee'])
        .orderBy('id', 'asc')

      logger.info(`${commandesActives.length} commande(s) active(s) trouvée(s)`)

      for (const commande of commandesActives) {
        try {
          // Construire les données de commande
          let user = null
          if (commande.userId) {
            user = await User.find(commande.userId)
          }
          
          const entreprise = commande.entrepriseId ? await Entreprise.find(commande.entrepriseId) : null
          
          const commandeProduits = await Database
            .from('commande_produits')
            .join('produits', 'commande_produits.produit_id', 'produits.id')
            .where('commande_produits.commande_id', commande.id)
            .select(
              'produits.nom',
              'commande_produits.quantite',
              'commande_produits.prix_unitaire'
            )

          const commandeData: CommandeData = {
            id: commande.id,
            numero_commande: commande.numeroCommande,
            statut: commande.statut,
            total: this.safeToNumber(commande.total),
            date_commande: commande.createdAt.toString(),
            creneaux_livraison: commande.creneauxLivraison,
            type_livraison: commande.typeLivraison,
            user: {
              email: user ? user.username : commande.telephoneLivraison || 'Client anonyme',
              prenom: undefined,
              nom: undefined
            },
            entreprise: {
              nom: entreprise ? entreprise.nom : 'Commande publique'
            },
            produits: commandeProduits.map((p: any) => ({
              nom: p.nom,
              quantite: p.quantite,
              prix_unitaire: this.safeToNumber(p.prix_unitaire)
            }))
          }

          // Éviter de régénérer si le message a été récemment modifié par une interaction
          if (commande.discordMessageId && this.recentlyUpdatedMessages.has(commande.discordMessageId)) {
            continue
          }

          // Essayer de mettre à jour l'ancien message, sinon créer un nouveau
          const success = await this.updateOrRecreateMessage(commande, commandeData)
          if (!success) {
            await this.createNewOrderMessage(commande, commandeData)
          }
          
          // Délai adaptatif pour éviter le rate limiting Discord
          const rateLimitDelay = Math.min(commandesActives.length * 100, 2000)
          await new Promise(resolve => setTimeout(resolve, rateLimitDelay))

        } catch (commandeError) {
          logger.error(`Erreur lors de la régénération de la commande #${commande.id}:`, commandeError)
        }
      }

      logger.info('✅ Régénération des messages Discord terminée')

    } catch (error) {
      logger.error('❌ Erreur lors de la régénération des messages Discord:', error)
    }
  }

  /**
   * Essaie de mettre à jour un message existant, sinon le supprime
   */
  private async updateOrRecreateMessage(commande: any, commandeData: CommandeData, forceUpdate: boolean = false): Promise<boolean> {
    try {
      const channel = await this.getChannelForCommande(commandeData)
      if (!channel || !commande.discordMessageId) return false

      // Essayer de récupérer l'ancien message
      const oldMessage = await channel.messages.fetch(commande.discordMessageId)
      if (!oldMessage) return false

      // Optimisation : vérifier l'âge du message pour la régénération périodique
      if (!forceUpdate) {
        const messageAge = Date.now() - oldMessage.createdTimestamp
        if (messageAge < 12 * 60 * 1000) { // Moins de 12 minutes
          logger.debug(`⏭️ Message #${commande.id} ignoré (trop récent: ${Math.round(messageAge / 60000)}min)`)
          return true // Considéré comme réussi, pas besoin de mise à jour
        }
      }

      // Vérifier si le message est dans le bon canal (livraison vs click&collect)
      const currentChannelId = oldMessage.channel.id
      const expectedChannelId = commandeData.type_livraison === 'click_and_collect' 
        ? this.clickCollectChannelId 
        : this.channelId

      if (currentChannelId !== expectedChannelId) {
        // Le message est dans le mauvais canal, le supprimer et créer un nouveau
        await oldMessage.delete()
        logger.info(`🔄 Message déplacé de canal pour commande #${commande.id}`)
        return false
      }

      // Mettre à jour le message existant (préserve les threads)
      const statusTitle = this.getStatusTitle(commande.statut)
      const statusColor = this.getStatusColor(commande.statut)
      
      const embed = this.createCommandeEmbed(
        commandeData, 
        statusTitle, 
        statusColor, 
        commande.claimedBy
      )
      const buttons = this.createCommandeButtons(commande.id, commande.statut)
      
      await oldMessage.edit({
        embeds: [embed],
        components: buttons
      })

      logger.info(`✅ Message mis à jour pour commande #${commande.id} (${commande.statut}) - threads préservés`)
      return true

    } catch (error) {
      logger.warn(`⚠️ Impossible de mettre à jour le message pour commande #${commande.id}:`, error.message)
      
      // Essayer de supprimer l'ancien message si il existe mais ne peut pas être mis à jour
      try {
        const channel = await this.getChannelForCommande(commandeData)
        if (channel && commande.discordMessageId) {
          const oldMessage = await channel.messages.fetch(commande.discordMessageId)
          if (oldMessage) {
            await oldMessage.delete()
            logger.info(`🗑️ Ancien message supprimé pour commande #${commande.id}`)
          }
        }
      } catch (deleteError) {
        logger.warn(`⚠️ Impossible de supprimer l'ancien message pour commande #${commande.id}`)
      }
      
      return false
    }
  }

  /**
   * Crée un nouveau message Discord pour une commande
   */
  private async createNewOrderMessage(commande: any, commandeData: CommandeData): Promise<void> {
    try {
      const channel = await this.getChannelForCommande(commandeData)
      if (!channel) return

      const statusTitle = this.getStatusTitle(commande.statut)
      const statusColor = this.getStatusColor(commande.statut)
      
      const embed = this.createCommandeEmbed(
        commandeData, 
        statusTitle, 
        statusColor, 
        commande.claimedBy
      )
      const buttons = this.createCommandeButtons(commande.id, commande.statut)
      
      const message = await channel.send({ 
        embeds: [embed],
        components: buttons
      })

      // Sauvegarder le nouvel ID de message
      commande.discordMessageId = message.id
      await commande.save()

      logger.info(`✅ Nouveau message créé pour commande #${commande.id} (${commande.statut})`)

    } catch (error) {
      logger.error(`❌ Erreur lors de la création du message pour commande #${commande.id}:`, error)
    }
  }

  /**
   * Retourne le titre selon le statut
   */
  private getStatusTitle(statut: string): string {
    switch (statut.toLowerCase()) {
      case 'en_attente':
        return '⏳ Commande En Attente'
      case 'confirmee':
        return '✅ Commande Confirmée'
      case 'en_preparation':
        return '👨‍🍳 Commande En Préparation'
      case 'prete':
        return '📦 Commande Prête'
      default:
        return '📋 Commande'
    }
  }

  /**
   * Régénère un message spécifique immédiatement
   */
  public async regenerateSpecificMessage(commandeId: number): Promise<boolean> {
    try {
      logger.info(`🔄 Régénération immédiate du message pour commande #${commandeId}`)
      
      // Importer les modèles nécessaires
      const { default: Commande } = await import('#models/commande')
      const { default: User } = await import('#models/user')
      const { default: Entreprise } = await import('#models/entreprise')
      const Database = (await import('@adonisjs/lucid/services/db')).default

      // Récupérer la commande spécifique
      const commande = await Commande.find(commandeId)
      if (!commande || ['livree', 'annulee'].includes(commande.statut)) {
        logger.warn(`⚠️ Commande #${commandeId} non trouvée ou terminée`)
        return false
      }

      // Construire les données de commande
      let user = null
      if (commande.userId) {
        user = await User.find(commande.userId)
      }
      
      const entreprise = commande.entrepriseId ? await Entreprise.find(commande.entrepriseId) : null
      
      const commandeProduits = await Database
        .from('commande_produits')
        .join('produits', 'commande_produits.produit_id', 'produits.id')
        .where('commande_produits.commande_id', commandeId)
        .select(
          'produits.nom',
          'commande_produits.quantite',
          'commande_produits.prix_unitaire'
        )

      const commandeData: CommandeData = {
        id: commande.id,
        numero_commande: commande.numeroCommande,
        statut: commande.statut,
        total: this.safeToNumber(commande.total),
        date_commande: commande.createdAt.toString(),
        creneaux_livraison: commande.creneauxLivraison,
        type_livraison: commande.typeLivraison,
        user: {
          email: user ? user.username : commande.telephoneLivraison || 'Client anonyme',
          prenom: undefined,
          nom: undefined
        },
        entreprise: {
          nom: entreprise ? entreprise.nom : 'Commande publique'
        },
        produits: commandeProduits.map((p: any) => ({
          nom: p.nom,
          quantite: p.quantite,
          prix_unitaire: this.safeToNumber(p.prix_unitaire)
        }))
      }

      // Forcer la mise à jour du message
      const success = await this.updateOrRecreateMessage(commande, commandeData, true)
      if (!success) {
        await this.createNewOrderMessage(commande, commandeData)
      }

      logger.info(`✅ Message régénéré pour commande #${commandeId}`)
      return true

    } catch (error) {
      logger.error(`❌ Erreur lors de la régénération spécifique pour commande #${commandeId}:`, error)
      return false
    }
  }

  /**
   * Démarre la régénération périodique des messages (optionnel)
   */
  private startPeriodicRegeneration(): void {
    // Régénérer toutes les 10 minutes pour maintenir les boutons fonctionnels
    this.regenerationInterval = setInterval(async () => {
      try {
        logger.info('🔄 Régénération périodique des messages Discord...')
        await this.regenerateActiveOrderMessages()
      } catch (error) {
        logger.error('❌ Erreur lors de la régénération périodique:', error)
      }
    }, 10 * 60 * 1000) // 10 minutes

    logger.info('⏰ Régénération automatique activée (toutes les 10 minutes)')
  }

  /**
   * Ferme la connexion Discord
   */
  public async shutdown(): Promise<void> {
    if (this.regenerationInterval) {
      clearInterval(this.regenerationInterval)
      this.regenerationInterval = null
      logger.info('⏰ Régénération automatique arrêtée')
    }

    if (this.client) {
      await this.client.destroy()
      this.isConnected = false
      logger.info('Connexion Discord fermée')
    }
  }
}

export default DiscordService.getInstance()
