import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import { loginValidator, registerValidator } from '#validators/auth'

export default class AuthController {
  async register({ request, response }: HttpContext) {
    const payload = await request.validateUsing(registerValidator)
    
    const user = await User.create(payload)
    await user.load('entreprise')
    
    return response.created({
      message: 'Utilisateur créé avec succès',
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        entreprise: user.entreprise
      }
    })
  }

  async login({ request, response, auth }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)
    
    const user = await User.verifyCredentials(email, password)
    
    if (!user.active) {
      return response.unauthorized({ message: 'Compte désactivé' })
    }

    await auth.use('web').login(user)
    await user.load('entreprise')
    
    return response.ok({
      message: 'Connexion réussie',
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        entreprise: user.entreprise
      }
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
        entreprise: auth.user!.entreprise
      }
    })
  }
}