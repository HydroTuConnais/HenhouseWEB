// Configuration des URLs de l'API et des ressources
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
export const IMAGE_BASE_URL = process.env.NEXT_PUBLIC_IMAGE_BASE_URL || 'http://localhost:3333';

// Fonction utilitaire pour construire une URL d'image complète
export const getImageUrl = (imagePath: string | null | undefined): string | null => {
  if (!imagePath) return null;
  // Si l'URL commence déjà par http, on la retourne telle quelle
  if (imagePath.startsWith('http')) return imagePath;
  // Sinon on concatène avec l'URL de base
  return `${IMAGE_BASE_URL}${imagePath}`;
};
