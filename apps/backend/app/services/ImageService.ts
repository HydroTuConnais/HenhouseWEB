import { MultipartFile } from '@adonisjs/core/bodyparser'
import { cuid } from '@adonisjs/core/helpers'
import { promises as fs } from 'fs'
import path from 'path'
import sharp from 'sharp'

export default class ImageService {
  private static uploadDir = 'public/uploads'
  
  // Types d'images autorisés
  private static allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  
  // Taille maximale en bytes (5MB)
  private static maxSize = 5 * 1024 * 1024

  /**
   * Valide un fichier image
   */
  static async validateImage(file: MultipartFile): Promise<void> {
    if (!file) {
      throw new Error('Aucun fichier fourni')
    }

    if (!this.allowedTypes.includes(file.type!)) {
      throw new Error('Type de fichier non autorisé. Utilisez JPG, PNG, WebP ou GIF')
    }

    if (file.size > this.maxSize) {
      throw new Error('Fichier trop volumineux. Maximum 5MB autorisé')
    }
  }

  /**
   * Upload et traite une image
   */
  static async uploadImage(
    file: MultipartFile, 
    folder: 'menus' | 'produits',
    options: {
      width?: number
      height?: number
      quality?: number
      format?: 'jpeg' | 'png' | 'webp'
    } = {}
  ): Promise<{ filename: string; path: string; url: string }> {
    
    await this.validateImage(file)

    // Créer les dossiers s'ils n'existent pas
    const uploadPath = path.join(this.uploadDir, folder)
    await fs.mkdir(uploadPath, { recursive: true })

    // Génération d'un nom unique
    const filename = `${cuid()}.${options.format || 'webp'}`
    const filePath = path.join(uploadPath, filename)

    // Traitement de l'image avec Sharp
    let sharpInstance = sharp(file.tmpPath!)

    // Redimensionnement si spécifié
    if (options.width || options.height) {
      sharpInstance = sharpInstance.resize(options.width, options.height, {
        fit: 'cover',
        position: 'center'
      })
    }

    // Conversion et compression
    switch (options.format || 'webp') {
      case 'jpeg':
        sharpInstance = sharpInstance.jpeg({ quality: options.quality || 85 })
        break
      case 'png':
        sharpInstance = sharpInstance.png({ quality: options.quality || 85 })
        break
      case 'webp':
        sharpInstance = sharpInstance.webp({ quality: options.quality || 85 })
        break
    }

    // Sauvegarde
    await sharpInstance.toFile(filePath)

    return {
      filename,
      path: filePath,
      url: `/uploads/${folder}/${filename}`
    }
  }

  /**
   * Supprime une image
   */
  static async deleteImage(imagePath: string): Promise<void> {
    try {
      if (imagePath && !imagePath.startsWith('http')) {
        const fullPath = path.join('public', imagePath)
        await fs.unlink(fullPath)
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'image:', error)
    }
  }

  /**
   * Génère plusieurs tailles d'images
   */
  static async generateThumbnails(
    file: MultipartFile,
    folder: 'menus' | 'produits'
  ): Promise<{
    original: { filename: string; url: string }
    thumbnail: { filename: string; url: string }
    medium: { filename: string; url: string }
  }> {
    const baseId = cuid()
    
    const [original, thumbnail, medium] = await Promise.all([
      this.uploadImage(file, folder, {
        width: 1200,
        height: 1200,
        quality: 90,
        format: 'webp'
      }),
      this.uploadImage(file, folder, {
        width: 200,
        height: 200,
        quality: 80,
        format: 'webp'
      }),
      this.uploadImage(file, folder, {
        width: 600,
        height: 600,
        quality: 85,
        format: 'webp'
      })
    ])

    return { original, thumbnail, medium }
  }
}