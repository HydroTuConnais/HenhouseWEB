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
  private channelId: string | undefined
  private isConnected: boolean = false
  private readyPromise: Promise<void> | null = null
  private processedInteractions: Set<string> = new Set()
  private botId: string = Math.random().toString(36).substring(7)

  constructor() {
    this.channelId = env.get('DISCORD_CHANNEL_ID')
    logger.info(`🤖 Bot Discord instance créée avec ID: ${this.botId}`)
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

      if (!this.channelId) {
        logger.warn('Discord channel ID not configured, Discord service disabled')
        return
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
    logger.info('🔄 Tentative d\'envoi de notification Discord...')
    
    // Assurer que le bot est prêt
    const isReady = await this.ensureReady()
    if (!isReady) {
      logger.error('❌ Impossible de connecter le bot Discord')
      return
    }

    try {
      const channel = await this.getChannel()
      if (!channel) {
        logger.error('❌ Impossible de récupérer le canal Discord')
        return
      }

      logger.info(`📤 Envoi du message vers le canal ${this.channelId}...`)
      const embed = this.createCommandeEmbed(commande, '🆕 Nouvelle Commande', 0x00ff00)
      const buttons = this.createCommandeButtons(commande.id, commande.statut)
      
      const message = await channel.send({ 
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
      
      logger.info(`✅ Notification Discord envoyée avec succès ! Message ID: ${message.id}`)
    } catch (error) {
      logger.error('❌ Erreur lors de l\'envoi de la notification Discord:', error)
      // Log plus détaillé de l'erreur
      if (error instanceof Error) {
        logger.error(`   Message: ${error.message}`)
        logger.error(`   Stack: ${error.stack}`)
      }
    }
  }

  /**
   * Envoie une notification de mise à jour de commande
   */
  public async notifyCommandeUpdate(commande: CommandeData, oldStatut: string): Promise<void> {
    if (!this.isReady()) return

    try {
      // Essayer de trouver le thread de la commande
      const thread = await this.findOrCreateThread(commande.numero_commande)
      
      if (thread) {
        // Envoyer dans le thread
        const actionEmbed = this.createActionEmbed('update', 'System', commande.numero_commande, commande.statut)
        await thread.send({ embeds: [actionEmbed] })
        logger.info(`📤 Message de mise à jour envoyé dans le thread pour la commande #${commande.id}`)
      } else {
        // Fallback: envoyer dans le canal principal
        const channel = await this.getChannel()
        if (!channel) return

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
      // Essayer de trouver le thread de la commande
      const thread = await this.findOrCreateThread(commande.numero_commande)
      
      if (thread) {
        // Envoyer dans le thread
        const cancelEmbed = this.createActionEmbed('cancel', 'System', commande.numero_commande, 'annulee')
        await thread.send({ embeds: [cancelEmbed] })
        logger.info(`📤 Message d'annulation envoyé dans le thread pour la commande #${commande.id}`)
      } else {
        // Fallback: envoyer dans le canal principal
        const channel = await this.getChannel()
        if (!channel) return

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
   * Récupère le canal Discord
   */
  private async getChannel(): Promise<TextChannel | null> {
    try {
      if (!this.channelId) {
        logger.error('❌ ID du canal Discord non configuré')
        return null
      }

      logger.info(`🔍 Recherche du canal Discord avec ID: ${this.channelId}`)
      
      if (!this.client) {
        logger.error('❌ Client Discord non disponible')
        return null
      }

      const channel = await this.client.channels.fetch(this.channelId)
      
      if (!channel) {
        logger.error(`❌ Canal Discord avec ID ${this.channelId} introuvable`)
        return null
      }

      if (!channel.isTextBased()) {
        logger.error(`❌ Le canal ${this.channelId} n'est pas un canal textuel`)
        return null
      }

      logger.info(`✅ Canal Discord trouvé: ${channel.type}`)
      return channel as TextChannel
    } catch (error) {
      logger.error('❌ Erreur lors de la récupération du canal Discord:', error)
      if (error instanceof Error) {
        logger.error(`   Message d'erreur: ${error.message}`)
      }
      return null
    }
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
  private createActionEmbed(action: string, username: string, numeroCommande: string, newStatut: string): EmbedBuilder {
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
        { name: '👤 Par', value: username, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: 'HenhouseWEB - Suivi de commandes' })

    return embed
  }

  /**
   * Trouve ou crée un thread pour une commande donnée
   */
  private async findOrCreateThread(commandeNumero: string, messageId?: string): Promise<any> {
    logger.info(`🎯 DEBUG findOrCreateThread: Recherche thread pour commande ${commandeNumero}, messageId: ${messageId}`)
    
    try {
      const channel = await this.getChannel()
      if (!channel) {
        logger.error(`🎯 DEBUG findOrCreateThread: ❌ Impossible de récupérer le canal`)
        return null
      }

      logger.info(`🎯 DEBUG findOrCreateThread: Canal récupéré: ${channel.id}`)

      // Essayer de trouver un thread existant dans les threads actifs ET archivés
      let thread = null
      try {
        logger.info(`🎯 DEBUG findOrCreateThread: Récupération des threads...`)
        
        const activeThreads = await channel.threads.fetchActive()
        const archivedThreads = await channel.threads.fetchArchived()
        
        logger.info(`🎯 DEBUG findOrCreateThread: Threads actifs: ${activeThreads.threads.size}, archivés: ${archivedThreads.threads.size}`)
        
        // Lister tous les threads pour debug
        activeThreads.threads.forEach((t, id) => {
          logger.info(`🎯 DEBUG findOrCreateThread: Thread actif: "${t.name}" (ID: ${id})`)
        })
        
        archivedThreads.threads.forEach((t, id) => {
          logger.info(`🎯 DEBUG findOrCreateThread: Thread archivé: "${t.name}" (ID: ${id})`)
        })
        
        // Chercher dans les threads actifs
        logger.info(`🎯 DEBUG findOrCreateThread: Recherche pattern "${commandeNumero}"...`)
        thread = activeThreads.threads.find(t => {
          const match = t.name.includes(commandeNumero)
          logger.info(`🎯 DEBUG findOrCreateThread: "${t.name}" match? ${match}`)
          return match
        })
        
        // Si pas trouvé, chercher dans les threads archivés
        if (!thread) {
          logger.info(`🎯 DEBUG findOrCreateThread: Pas trouvé dans actifs, recherche dans archivés...`)
          thread = archivedThreads.threads.find(t => {
            const match = t.name.includes(commandeNumero)
            logger.info(`🎯 DEBUG findOrCreateThread: Archivé "${t.name}" match? ${match}`)
            return match
          })
        }
        
        logger.info(`🔍 Recherche thread ${commandeNumero} - Actifs: ${activeThreads.threads.size}, Archivés: ${archivedThreads.threads.size}`)
        if (thread) {
          logger.info(`✅ Thread existant trouvé: ${thread.name} (ID: ${thread.id})`)
        } else {
          logger.info(`🎯 DEBUG findOrCreateThread: ❌ Aucun thread trouvé avec pattern "CMD-${commandeNumero}"`)
        }
      } catch (error) {
        logger.error('🎯 DEBUG findOrCreateThread: ❌ Erreur récupération threads:', error)
        logger.error('🎯 DEBUG findOrCreateThread: Message:', error.message)
      }

      // Si aucun thread n'existe et qu'on a un messageId, essayer de créer un thread
      if (!thread && messageId) {
        logger.info(`🎯 DEBUG findOrCreateThread: Pas de thread + messageId fourni, création...`)
        try {
          const message = await channel.messages.fetch(messageId)
          logger.info(`🎯 DEBUG findOrCreateThread: Message récupéré: ${message?.id}`)
          
          if (message) {
            const threadName = `📋 Suivi Commande #${commandeNumero}`
            logger.info(`🎯 DEBUG findOrCreateThread: Création thread "${threadName}"...`)
            
            thread = await message.startThread({
              name: threadName,
              autoArchiveDuration: 1440, // 24 heures
              reason: 'Suivi des actions sur la commande'
            })
            logger.info(`🧵 Thread créé: ${thread.name} (ID: ${thread.id})`)
          } else {
            logger.error(`🎯 DEBUG findOrCreateThread: ❌ Message non trouvé avec ID ${messageId}`)
          }
        } catch (threadError) {
          logger.error('❌ Erreur lors de la création du thread:', threadError)
          logger.error('🎯 DEBUG findOrCreateThread: Code:', threadError.code)
          logger.error('🎯 DEBUG findOrCreateThread: Message:', threadError.message)
          logger.error('🎯 DEBUG findOrCreateThread: Stack:', threadError.stack)
        }
      } else if (!thread && !messageId) {
        logger.warn(`🎯 DEBUG findOrCreateThread: Pas de thread ET pas de messageId`)
      }

      logger.info(`🎯 DEBUG findOrCreateThread: Résultat final: ${thread ? `Thread "${thread.name}" (${thread.id})` : 'null'}`)
      return thread
    } catch (error) {
      logger.error('❌ Erreur lors de la recherche/création du thread:', error)
      logger.error('🎯 DEBUG findOrCreateThread: Erreur générale:', error.message)
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
    logger.info(`🔄 [${this.botId}] Interaction reçue: ${interaction.customId} par ${interaction.user.username}`)
    logger.info(`🎯 DEBUG: Interaction ID: ${interaction.id}`)
    logger.info(`🎯 DEBUG: Guild ID: ${interaction.guildId}`)
    logger.info(`🎯 DEBUG: Channel ID: ${interaction.channelId}`)
    logger.info(`🎯 DEBUG: User ID: ${interaction.user.id}`)
    logger.info(`🎯 DEBUG: État initial - deferred: ${interaction.deferred}, replied: ${interaction.replied}`)
    
    // Vérifier l'âge de l'interaction
    const interactionAge = Date.now() - interaction.createdTimestamp
    logger.info(`🎯 DEBUG: Âge de l'interaction: ${interactionAge}ms`)
    logger.info(`🎯 DEBUG: Timestamp actuel: ${Date.now()}, Timestamp interaction: ${interaction.createdTimestamp}`)
    
    // Vérifier si l'interaction a déjà été traitée
    if (interaction.deferred || interaction.replied) {
      logger.warn(`⚠️ Interaction déjà traitée - deferred: ${interaction.deferred}, replied: ${interaction.replied}`)
      return
    }
    
    // Vérifier si on a déjà traité cette interaction (déduplication)
    if (this.processedInteractions.has(interaction.id)) {
      logger.warn(`⚠️ [${this.botId}] Interaction déjà traitée par cette instance: ${interaction.id}`)
      return
    }
    
    // Marquer l'interaction comme en cours de traitement
    this.processedInteractions.add(interaction.id)
    logger.info(`🎯 DEBUG: [${this.botId}] Interaction marquée comme en traitement`)
    
    // Vérifier si l'interaction n'est pas trop ancienne (plus de 2 secondes)
    // TEMPORAIREMENT DÉSACTIVÉ à cause du problème d'horloge
    if (Math.abs(interactionAge) > 5000) { // Utiliser Math.abs et augmenter la tolérance
      logger.warn(`⚠️ Interaction trop ancienne/future (${interactionAge}ms), abandon`)
      this.processedInteractions.delete(interaction.id)
      return
    }
    
    try {
      logger.info(`🎯 DEBUG: Tentative de defer reply...`)
      // Déférer la réponse immédiatement pour avoir plus de temps (15 minutes au lieu de 3 secondes)
      
      try {
        await interaction.deferReply({ flags: 64 }) // MessageFlags.Ephemeral
        logger.info(`🎯 DEBUG: ✅ Defer reply réussi !`)
      } catch (deferError: any) {
        if (deferError.code === 10062) { // Unknown interaction
          logger.warn(`⚠️ Interaction expirée avant defer, tentative de reply direct...`)
          try {
            await interaction.reply({ 
              content: '⏱️ Traitement en cours...', 
              flags: 64 
            })
            logger.info(`🎯 DEBUG: ✅ Reply direct réussi comme fallback`)
          } catch (fallbackError) {
            logger.error(`❌ Impossible de répondre à l'interaction expirée:`, fallbackError)
            this.processedInteractions.delete(interaction.id)
            return
          }
        } else {
          throw deferError // Re-lancer si ce n'est pas une expiration
        }
      }
      
      logger.info(`🎯 DEBUG: Parsing custom ID...`)
      const [action, commandeIdStr] = interaction.customId.split('_')
      const commandeId = parseInt(commandeIdStr)

      logger.info(`🔍 Action: ${action}, ID Commande: ${commandeId}`)
      logger.info(`🎯 DEBUG: Custom ID split result: action="${action}", commandeIdStr="${commandeIdStr}"`)

      if (isNaN(commandeId)) {
        logger.error(`❌ ID de commande invalide: ${commandeIdStr}`)
        logger.info(`🎯 DEBUG: Tentative d'edit reply pour erreur ID invalide...`)
        await interaction.editReply({ 
          content: '❌ ID de commande invalide'
        })
        logger.info(`🎯 DEBUG: ✅ Edit reply erreur réussi`)
        return
      }
      
      logger.info(`🎯 DEBUG: Import du modèle Commande...`)
      // Importer le modèle Commande ici pour éviter les dépendances circulaires
      const { default: Commande } = await import('#models/commande')
      logger.info(`🎯 DEBUG: ✅ Modèle Commande importé`)
      
      logger.info(`🔎 Recherche de la commande ${commandeId}...`)
      const commande = await Commande.find(commandeId)
      logger.info(`🎯 DEBUG: Résultat de la recherche: ${commande ? `trouvée (statut: ${commande.statut})` : 'non trouvée'}`)
      
      if (!commande) {
        logger.error(`❌ Commande ${commandeId} non trouvée`)
        logger.info(`🎯 DEBUG: Tentative d'edit reply pour commande non trouvée...`)
        await interaction.editReply({ 
          content: `❌ Commande #${commandeId} non trouvée`
        })
        logger.info(`🎯 DEBUG: ✅ Edit reply commande non trouvée réussi`)
        return
      }

      const oldStatut = commande.statut
      let newStatut = oldStatut

      logger.info(`📊 Statut actuel: ${oldStatut}`)

      // Déterminer le nouveau statut selon l'action
      logger.info(`🎯 DEBUG: Début du switch avec action: ${action}`)
      switch (action) {
        case 'claim':
          logger.info(`🎯 DEBUG: Action claim détectée, statut actuel: ${commande.statut}`)
          if (commande.statut === 'en_attente') {
            logger.info(`🎯 DEBUG: Statut en_attente, processing claim...`)
            commande.claimedBy = interaction.user.username
            commande.claimedAt = DateTime.now()
            newStatut = 'confirmee'
          } else if (commande.statut === 'confirmee' && commande.claimedBy) {
            // Cas spécial: la commande est déjà claim mais le message Discord n'a pas été mis à jour
            logger.info(`🔧 DEBUG: Commande déjà claim par ${commande.claimedBy}, réparation du message Discord...`)
            newStatut = 'confirmee' // Garder le statut actuel
            // Ne pas modifier claimedBy car c'est déjà fait
          } else {
            logger.info(`🎯 DEBUG: Statut != en_attente et pas réparable, envoi message d'erreur`)
            await interaction.editReply({ 
              content: '❌ Cette commande ne peut plus être claim'
            })
            logger.info(`🎯 DEBUG: ✅ EditReply erreur claim envoyé`)
            
            // IMPORTANT: Toujours nettoyer le cache même en cas d'erreur
            this.processedInteractions.delete(interaction.id)
            return
          }
          break

        case 'prepare':
          if (commande.statut === 'confirmee') {
            newStatut = 'en_preparation'
          } else if (commande.statut === 'en_preparation') {
            logger.info(`🔧 DEBUG: Commande déjà en préparation, réparation du message Discord...`)
            newStatut = 'en_preparation' // Garder le statut actuel
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
            logger.info(`🔧 DEBUG: Commande déjà prête, réparation du message Discord...`)
            newStatut = 'prete' // Garder le statut actuel
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
            logger.info(`🔧 DEBUG: Commande déjà livrée, réparation du message Discord...`)
            newStatut = 'livree' // Garder le statut actuel
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
            logger.info(`🔧 DEBUG: Commande déjà annulée, réparation du message Discord...`)
            newStatut = 'annulee' // Garder le statut actuel
          } else {
            await interaction.editReply({ content: '❌ Cette commande ne peut pas être annulée' })
            this.processedInteractions.delete(interaction.id)
            return
          }
          break

        default:
          logger.error(`❌ Action non reconnue: ${action}`)
          await interaction.editReply({ 
            content: '❌ Action non reconnue'
          })
          return
      }

      logger.info(`🔄 Changement de statut: ${oldStatut} → ${newStatut}`)

      // Mettre à jour la commande seulement si le statut a changé
      if (oldStatut !== newStatut) {
        commande.statut = newStatut as any
        await commande.save()
        logger.info(`💾 Commande sauvegardée avec le nouveau statut`)
      } else {
        logger.info(`🔧 Pas de changement de statut, réparation du message Discord uniquement`)
      }

      // Recréer les données de commande et mettre à jour le message
      const { default: User } = await import('#models/user')
      const { default: Entreprise } = await import('#models/entreprise')
      const Database = (await import('@adonisjs/lucid/services/db')).default

      logger.info(`🔄 Reconstruction des données de commande...`)

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
      const embed = this.createCommandeEmbed(commandeData, statusTitle, statusColor, displayClaimedBy)
      const buttons = this.createCommandeButtons(commandeId, newStatut)

      logger.info(`🔄 Mise à jour du message Discord...`)

      // Mettre à jour SEULEMENT le message original (les boutons et le statut dans l'embed)
      logger.info(`🎯 DEBUG: Début de la mise à jour du message original...`)
      const originalMessage = interaction.message
      logger.info(`🎯 DEBUG: Message original récupéré: ${originalMessage ? 'OUI' : 'NON'}`)
      
      if (originalMessage) {
        logger.info(`🎯 DEBUG: Tentative d'édition du message original...`)
        
        // S'assurer que l'embed reflète le nouveau statut et les informations de claim
        const updatedEmbed = this.createCommandeEmbed(
          commandeData, 
          statusTitle, 
          statusColor, 
          action === 'claim' ? interaction.user.username : commande.claimedBy
        )
        
        // S'assurer que les boutons reflètent le nouveau statut
        const updatedButtons = this.createCommandeButtons(commandeId, newStatut)
        
        await originalMessage.edit({
          embeds: [updatedEmbed],
          components: updatedButtons
        })
        logger.info(`🔄 ✅ Message original mis à jour avec le nouveau statut: ${newStatut} et claimedBy: ${commande.claimedBy}`)
      } else {
        logger.warn(`⚠️ Impossible de mettre à jour le message original - message non trouvé`)
      }

      // 🚨 DEBUG: Créer ou récupérer le thread associé au message et envoyer SEULEMENT le message dans le thread
      logger.info(`🎯 DEBUG: Début de la gestion du thread pour l'action "${action}" sur commande #${commande.numeroCommande}`)
      try {
        let thread = null

        logger.info(`🎯 DEBUG: Message original ID: ${originalMessage?.id}`)
        logger.info(`🎯 DEBUG: Channel type: ${originalMessage?.channel?.type}`)
        logger.info(`🎯 DEBUG: Channel ID: ${originalMessage?.channel?.id}`)

        if (originalMessage && originalMessage.id) {
          // Essayer de récupérer le thread existant de plusieurs façons
          try {
            const channel = originalMessage.channel
            logger.info(`🎯 DEBUG: Canal récupéré, vérification si c'est un canal avec threads...`)
            
            if ('threads' in channel) {
              logger.info(`🎯 DEBUG: ✅ Le canal supporte les threads, récupération...`)
              
              // Récupérer tous les threads (actifs ET archivés)
              const activeThreads = await channel.threads.fetchActive()
              logger.info(`🎯 DEBUG: Threads actifs récupérés: ${activeThreads.threads.size}`)
              
              // Lister tous les threads actifs pour debug
              activeThreads.threads.forEach((t, id) => {
                logger.info(`🎯 DEBUG: Thread actif: "${t.name}" (ID: ${id})`)
              })
              
              const archivedThreads = await channel.threads.fetchArchived()
              logger.info(`🎯 DEBUG: Threads archivés récupérés: ${archivedThreads.threads.size}`)
              
              // Lister tous les threads archivés pour debug
              archivedThreads.threads.forEach((t, id) => {
                logger.info(`🎯 DEBUG: Thread archivé: "${t.name}" (ID: ${id})`)
              })
              
              // Chercher dans les threads actifs
              logger.info(`🎯 DEBUG: Recherche du pattern "${commande.numeroCommande}" dans les threads actifs...`)
              thread = activeThreads.threads.find(t => {
                const match = t.name.includes(commande.numeroCommande)
                logger.info(`🎯 DEBUG: Thread "${t.name}" match ${commande.numeroCommande}? ${match}`)
                return match
              })
              
              // Si pas trouvé, chercher dans les threads archivés
              if (!thread) {
                logger.info(`🎯 DEBUG: Recherche du pattern "${commande.numeroCommande}" dans les threads archivés...`)
                thread = archivedThreads.threads.find(t => {
                  const match = t.name.includes(commande.numeroCommande)
                  logger.info(`🎯 DEBUG: Thread archivé "${t.name}" match ${commande.numeroCommande}? ${match}`)
                  return match
                })
              }
              
              logger.info(`🔍 Threads actifs: ${activeThreads.threads.size}, archivés: ${archivedThreads.threads.size}`)
              if (thread) {
                logger.info(`✅ Thread existant trouvé: ${thread.name} (ID: ${thread.id})`)
              } else {
                logger.info(`🎯 DEBUG: ❌ Aucun thread trouvé avec le pattern "CMD-${commande.numeroCommande}"`)
              }
            } else {
              logger.error(`🎯 DEBUG: ❌ Le canal ne supporte pas les threads`)
            }
          } catch (error) {
            logger.error('🎯 DEBUG: ❌ Erreur lors de la récupération des threads:', error)
            logger.error('🎯 DEBUG: Détails de l\'erreur:', error.message)
            logger.error('🎯 DEBUG: Stack:', error.stack)
          }

          // Si aucun thread n'existe, en créer un SEULEMENT lors du premier claim
          if (!thread && action === 'claim') {
            logger.info(`🎯 DEBUG: Aucun thread trouvé ET action = "claim", tentative de création...`)
            try {
              const threadName = `📋 Suivi Commande #${commande.numeroCommande}`
              logger.info(`🎯 DEBUG: Nom du thread à créer: "${threadName}"`)
              logger.info(`🎯 DEBUG: Message utilisé pour créer le thread: ${originalMessage.id}`)
              
              thread = await originalMessage.startThread({
                name: threadName,
                autoArchiveDuration: 1440, // 24 heures
                reason: 'Suivi des actions sur la commande'
              })
              logger.info(`🧵 Thread créé avec succès: ${thread.name} (ID: ${thread.id})`)
            } catch (threadError) {
              logger.error('❌ Erreur lors de la création du thread:', threadError)
              logger.error('🎯 DEBUG: Code d\'erreur:', threadError.code)
              logger.error('🎯 DEBUG: Message d\'erreur:', threadError.message)
              logger.error('🎯 DEBUG: Stack complet:', threadError.stack)
            }
          } else if (!thread && action !== 'claim') {
            logger.warn(`🎯 DEBUG: Aucun thread trouvé mais action="${action}" (pas claim), pas de création`)
          } else if (thread) {
            logger.info(`🎯 DEBUG: Thread déjà trouvé, pas besoin de créer`)
          }

          // Envoyer SEULEMENT le message dans le thread, PAS dans le channel principal
          if (thread) {
            logger.info(`🎯 DEBUG: Tentative d'envoi du message dans le thread...`)
            
            try {
              // Créer un embed pour l'action
              const actionEmbed = this.createActionEmbed(action, interaction.user.username, commande.numeroCommande, newStatut)
              await thread.send({ embeds: [actionEmbed] })
              logger.info(`📤 Message envoyé dans le thread: ${thread.name}`)
            } catch (sendError) {
              logger.error('🎯 DEBUG: ❌ Erreur lors de l\'envoi du message dans le thread:', sendError)
              logger.error('🎯 DEBUG: Détails:', sendError.message)
            }
          } else {
            logger.warn(`⚠️ Aucun thread trouvé/créé pour la commande #${commande.numeroCommande}`)
            logger.warn(`🎯 DEBUG: Action: ${action}, Thread null: ${thread === null}`)
          }
        } else {
          logger.error(`🎯 DEBUG: ❌ Pas de message original ou ID manquant`)
          logger.error(`🎯 DEBUG: originalMessage: ${!!originalMessage}`)
          logger.error(`🎯 DEBUG: originalMessage.id: ${originalMessage?.id}`)
        }
      } catch (threadError) {
        logger.error('❌ Erreur générale lors de la gestion du thread:', threadError)
        logger.error('🎯 DEBUG: Type d\'erreur:', threadError.constructor.name)
        logger.error('🎯 DEBUG: Message:', threadError.message)
        logger.error('🎯 DEBUG: Stack complet:', threadError.stack)
        // En cas d'erreur, NE PAS envoyer de message dans le channel principal
      }

      // Confirmer l'action à l'utilisateur
      const isRepair = oldStatut === newStatut
      const confirmMessage = isRepair 
        ? `🔧 Message Discord réparé pour la commande #${commande.numeroCommande} (statut: ${newStatut})`
        : `✅ Action "${action}" effectuée avec succès sur la commande #${commande.numeroCommande}`
      
      await interaction.editReply({ 
        content: confirmMessage
      })

      logger.info(`✅ Interaction traitée avec succès`)

    } catch (error) {
      // Nettoyer l'interaction du cache en cas d'erreur
      this.processedInteractions.delete(interaction.id)
      logger.error('❌ Erreur lors de la gestion de l\'interaction:', error)
      logger.error(`🎯 DEBUG: Type d'erreur: ${error.constructor.name}`)
      if (error instanceof Error) {
        logger.error(`   Message d'erreur: ${error.message}`)
        logger.error(`   Stack trace: ${error.stack}`)
      }
      logger.info(`🎯 DEBUG: État de l'interaction:`)
      logger.info(`🎯 DEBUG: - deferred: ${interaction.deferred}`)
      logger.info(`🎯 DEBUG: - replied: ${interaction.replied}`)
      logger.info(`🎯 DEBUG: - isApplicationCommand: ${interaction.isButton()}`)
      
      try {
        logger.info(`🎯 DEBUG: Tentative de réponse d'erreur...`)
        if (interaction.deferred) {
          logger.info(`🎯 DEBUG: Utilisation d'editReply pour l'erreur...`)
          await interaction.editReply({ 
            content: '❌ Une erreur est survenue lors du traitement'
          })
          logger.info(`🎯 DEBUG: ✅ EditReply erreur réussi`)
        } else if (!interaction.replied) {
          logger.info(`🎯 DEBUG: Utilisation de reply pour l'erreur...`)
          await interaction.reply({ 
            content: '❌ Une erreur est survenue lors du traitement', 
            flags: 64 // MessageFlags.Ephemeral
          })
          logger.info(`🎯 DEBUG: ✅ Reply erreur réussi`)
        } else {
          logger.info(`🎯 DEBUG: Interaction déjà répondue, pas de réponse d'erreur envoyée`)
        }
      } catch (replyError) {
        logger.error('❌ Erreur lors de la réponse d\'erreur:', replyError)
        logger.error(`🎯 DEBUG: Type d'erreur de réponse: ${replyError.constructor.name}`)
        if (replyError instanceof Error) {
          logger.error(`🎯 DEBUG: Message erreur de réponse: ${replyError.message}`)
        }
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
   * Ferme la connexion Discord
   */
  public async shutdown(): Promise<void> {
    if (this.client) {
      await this.client.destroy()
      this.isConnected = false
      logger.info('Connexion Discord fermée')
    }
  }
}

export default DiscordService.getInstance()
