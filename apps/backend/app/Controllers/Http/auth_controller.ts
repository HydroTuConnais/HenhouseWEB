import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { loginValidator, registerValidator } from '#validators/auth'
import hash from '@adonisjs/core/services/hash'

export default class AuthController {
  async register({ request, response }: HttpContext) {
    const payload = await request.validateUsing(registerValidator)

    const existingUser = await User.findBy('username', payload.username)

    if (existingUser) {
      return response.conflict({
        message: "Ce nom d'utilisateur est déjà utilisé",
        field: 'username',
      })
    }

    const user = await User.create(payload)

    if (user.entrepriseId) {
      await user.load('entreprise')
    }

    return response.created({
      message: 'Utilisateur créé avec succès',
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        entreprise: user.entreprise,
      },
    })
  }

  async login({ request, response, auth }: HttpContext) {
    const { username, password } = await request.validateUsing(loginValidator)

    const user = await User.verifyCredentials(username, password)

    if (!user.active) {
      return response.unauthorized({ message: 'Compte désactivé' })
    }

    await auth.use('web').login(user)

    if (user.entrepriseId) {
      await user.load('entreprise')
    }

    return response.ok({
      message: 'Connexion réussie',
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        entreprise: user.entreprise,
      },
    })
  }

  async logout({ auth, response }: HttpContext) {
    await auth.use('web').logout()
    return response.ok({ message: 'Déconnexion réussie' })
  }

  async me({ auth, response }: HttpContext) {
    if (auth.user!.entrepriseId) {
      await auth.user!.load('entreprise')
    }

    return response.ok({
      user: {
        id: auth.user!.id,
        username: auth.user!.username,
        role: auth.user!.role,
        entreprise: auth.user?.entreprise,
      },
    })
  }

  async changePassword({ request, response, auth }: HttpContext) {
    const { currentPassword, newPassword } = request.only(['currentPassword', 'newPassword'])

    if (!currentPassword || !newPassword) {
      return response.badRequest({
        message: 'Mot de passe actuel et nouveau mot de passe requis'
      })
    }

    if (newPassword.length < 6) {
      return response.badRequest({
        message: 'Le nouveau mot de passe doit contenir au moins 6 caractères'
      })
    }

    const user = auth.user!

    // Vérifier le mot de passe actuel
    const isCurrentPasswordValid = await hash.verify(user.password, currentPassword)
    if (!isCurrentPasswordValid) {
      return response.badRequest({
        message: 'Mot de passe actuel incorrect'
      })
    }

    // Mettre à jour le mot de passe
    user.password = newPassword
    await user.save()

    return response.ok({
      message: 'Mot de passe modifié avec succès'
    })
  }
}
