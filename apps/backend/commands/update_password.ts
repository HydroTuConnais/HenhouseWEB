import { BaseCommand } from '@adonisjs/core/ace'
import User from '#models/user'

export default class UpdatePassword extends BaseCommand {
  static commandName = 'update:password'
  static description = 'Update user password'

  async run() {
    try {
      const user = await User.find(5) // ID de Cente
      if (user) {
        user.password = 'vicente'
        await user.save()
        this.logger.success('✅ Mot de passe mis à jour pour Cente')
        this.logger.info('🔑 Nouveau mot de passe : vicente')
      } else {
        this.logger.error('❌ Utilisateur non trouvé')
      }
    } catch (error) {
      this.logger.error('❌ Erreur:', error.message)
    }
  }
}
