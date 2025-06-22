import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { loginValidator, registerValidator } from '#validators/auth'

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
    await auth.user!.load('entreprise')
    return response.ok({
      user: {
        id: auth.user!.id,
        username: auth.user!.username,
        role: auth.user!.role,
        entreprise: auth.user!.entreprise,
      },
    })
  }
}
