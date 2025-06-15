import type { HttpContext } from '@adonisjs/core/http'
import { cuid } from '@adonisjs/core/helpers'

export default class UploadController {
  async uploadMenu({ request, response }: HttpContext) {
    const image = request.file('image', {
      size: '2mb',
      extnames: ['jpg', 'png', 'jpeg', 'webp'],
    })

    if (!image) {
      return response.badRequest({ message: 'Aucune image fournie' })
    }

    const fileName = `${cuid()}.${image.extname}`
    await image.move('public/uploads/menus', {
      name: fileName,
      overwrite: true,
    })

    return response.ok({
      message: 'Image menu uploadée avec succès',
      path: `uploads/menus/${fileName}`,
    })
  }

  async uploadProduit({ request, response }: HttpContext) {
    const image = request.file('image', {
      size: '2mb',
      extnames: ['jpg', 'png', 'jpeg', 'webp'],
    })

    if (!image) {
      return response.badRequest({ message: 'Aucune image fournie' })
    }

    const fileName = `${cuid()}.${image.extname}`
    await image.move('public/uploads/produits', {
      name: fileName,
      overwrite: true,
    })

    return response.ok({
      message: 'Image produit uploadée avec succès',
      path: `uploads/produits/${fileName}`,
    })
  }
}
