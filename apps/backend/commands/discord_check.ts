import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import env from '#start/env'

export default class DiscordCheck extends BaseCommand {
  static commandName = 'discord:check'
  static description = 'Vérifie la configuration Discord'

  static options: CommandOptions = {
    startApp: true,
    allowUnknownFlags: false,
    staysAlive: false,
  }

  async run() {
    this.logger.info('🔍 Vérification de la configuration Discord...')
    
    const token = env.get('DISCORD_BOT_TOKEN')
    const channelId = env.get('DISCORD_CHANNEL_ID')
    
    if (!token) {
      this.logger.error('❌ DISCORD_BOT_TOKEN non configuré dans .env')
    } else {
      this.logger.success('✅ DISCORD_BOT_TOKEN configuré')
      this.logger.info(`   Token: ${token.substring(0, 20)}...`)
    }
    
    if (!channelId) {
      this.logger.error('❌ DISCORD_CHANNEL_ID non configuré dans .env')
    } else {
      this.logger.success('✅ DISCORD_CHANNEL_ID configuré')
      this.logger.info(`   Channel ID: ${channelId}`)
    }
    
    if (token && channelId) {
      this.logger.success('🎉 Configuration Discord complète!')
      this.logger.info('📝 Vous pouvez maintenant tester avec: node ace discord:test')
    } else {
      this.logger.error('⚠️  Configuration incomplète. Consultez DISCORD_SETUP.md')
    }
  }
}
