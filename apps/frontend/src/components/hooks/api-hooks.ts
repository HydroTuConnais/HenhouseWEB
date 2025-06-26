import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/query-client'
import { useEntrepriseId } from '@/components/stores/auth-store'

export interface Product {
  id: number
  nom: string
  description: string
  prix: number
  categorie: 'plat' | 'boisson' | 'dessert' | 'accompagnement'
  active: boolean
  imageUrl?: string
  fullImageUrl?: string
}

export interface Menu {
  id: number
  nom: string
  description: string
  prix: number
  active: boolean
  imageUrl?: string
  fullImageUrl?: string
}

export const useMenus = (entrepriseId?: number) => {
  const userEntrepriseId = useEntrepriseId()
  const finalEntrepriseId = entrepriseId || userEntrepriseId
  
  return useQuery({
    queryKey: ['menus', finalEntrepriseId],
    queryFn: async () => {
      const url = finalEntrepriseId 
        ? `/api/menus?entreprise_id=${finalEntrepriseId}`
        : `/api/menus`
      const response = await apiRequest(url)
      return Array.isArray(response) ? response : (response.data || [])
    },
    enabled: true, // Toujours activer la query, même sans entrepriseId
  })
}

export const useProduits = (entrepriseId?: number) => {
  const userEntrepriseId = useEntrepriseId()
  const finalEntrepriseId = entrepriseId || userEntrepriseId
  
  return useQuery({
    queryKey: ['produits', finalEntrepriseId],
    queryFn: async () => {
      const url = finalEntrepriseId 
        ? `/api/produits?entreprise_id=${finalEntrepriseId}`
        : `/api/produits`
      const response = await apiRequest(url)
      return Array.isArray(response) ? response : (response.data || [])
    },
    enabled: true, // Toujours activer la query, même sans entrepriseId
  })
}