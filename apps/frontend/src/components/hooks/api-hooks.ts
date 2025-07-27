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

// Hook pour récupérer les menus publics (non liés à des entreprises)
export const usePublicMenus = () => {
  return useQuery({
    queryKey: ['menus-public'],
    queryFn: async () => {
      const response = await apiRequest('/api/menus') // Route publique
      return response.menus || []
    },
    enabled: true,
  })
}

// Hook pour récupérer les produits publics (non liés à des entreprises)
export const usePublicProduits = () => {
  return useQuery({
    queryKey: ['produits-public'],
    queryFn: async () => {
      const response = await apiRequest('/api/produits') // Route publique
      return response.produits || []
    },
    enabled: true,
  })
}

// Hook hybride pour récupérer TOUS les menus accessibles à l'utilisateur
export const useMenus = () => {
  const userEntrepriseId = useEntrepriseId()
  
  const publicMenusQuery = useQuery({
    queryKey: ['menus-public'],
    queryFn: async () => {
      const response = await apiRequest('/api/menus') // Route publique
      return response.menus || []
    },
    enabled: true,
  })

  const entrepriseMenusQuery = useQuery({
    queryKey: ['entreprise-menus', userEntrepriseId],
    queryFn: async () => {
      if (!userEntrepriseId) return []
      const response = await apiRequest(`/api/entreprises/${userEntrepriseId}/menus`) // Route protégée
      return response.menus || []
    },
    enabled: !!userEntrepriseId,
  })

  return {
    data: [
      ...(publicMenusQuery.data || []),
      ...(entrepriseMenusQuery.data || [])
    ],
    isLoading: publicMenusQuery.isLoading || entrepriseMenusQuery.isLoading,
    error: publicMenusQuery.error || entrepriseMenusQuery.error,
  }
}

// Hook hybride pour récupérer TOUS les produits accessibles à l'utilisateur
export const useProduits = () => {
  const userEntrepriseId = useEntrepriseId()
  
  const publicProduitsQuery = useQuery({
    queryKey: ['produits-public'],
    queryFn: async () => {
      const response = await apiRequest('/api/produits') // Route publique
      return response.produits || []
    },
    enabled: true,
  })

  const entrepriseProduitsQuery = useQuery({
    queryKey: ['entreprise-produits', userEntrepriseId],
    queryFn: async () => {
      if (!userEntrepriseId) return []
      const response = await apiRequest(`/api/entreprises/${userEntrepriseId}/produits`) // Route protégée
      return response.produits || []
    },
    enabled: !!userEntrepriseId,
  })

  return {
    data: [
      ...(publicProduitsQuery.data || []),
      ...(entrepriseProduitsQuery.data || [])
    ],
    isLoading: publicProduitsQuery.isLoading || entrepriseProduitsQuery.isLoading,
    error: publicProduitsQuery.error || entrepriseProduitsQuery.error,
  }
}

// Hook pour récupérer les menus d'une entreprise spécifique (PROTÉGÉ)
export const useEntrepriseMenus = (entrepriseId: number, enabled = true) => {
  return useQuery({
    queryKey: ['entreprise-menus', entrepriseId],
    queryFn: async () => {
      const response = await apiRequest(`/api/entreprises/${entrepriseId}/menus`) // Route protégée
      return response.menus || []
    },
    enabled: enabled && !!entrepriseId,
  })
}

// Hook pour récupérer les produits d'une entreprise spécifique (PROTÉGÉ)
export const useEntrepriseProduits = (entrepriseId: number, enabled = true) => {
  return useQuery({
    queryKey: ['entreprise-produits', entrepriseId],
    queryFn: async () => {
      const response = await apiRequest(`/api/entreprises/${entrepriseId}/produits`) // Route protégée
      return response.produits || []
    },
    enabled: enabled && !!entrepriseId,
  })
}

// Hook pour récupérer la liste des entreprises (ADMIN UNIQUEMENT)
export const useEntreprises = () => {
  return useQuery({
    queryKey: ['entreprises'],
    queryFn: async () => {
      const response = await apiRequest('/api/entreprises') // Route protégée admin
      return response.entreprises || []
    },
  })
}

// ========== HOOKS ADMIN ==========

// Types pour l'admin - BASÉS SUR LES MODÈLES BACKEND
export interface AdminEntreprise {
  id: number
  nom: string
  createdAt: string
  updatedAt: string
}

export interface AdminUser {
  id: number
  username: string
  role: 'admin' | 'entreprise'
  entrepriseId?: number | null
  active: boolean
  createdAt: string
  updatedAt: string
  entreprise?: {
    id: number
    nom: string
  }
}

export interface AdminMenu {
  id: number
  nom: string
  description?: string | null
  prix: number
  active: boolean
  imageUrl?: string | null
  imagePath?: string | null
  createdAt: string
  updatedAt: string
  entreprises?: Array<{
    id: number
    nom: string
  }>
  produits?: Array<{
    id: number
    nom: string
    prix: number
    imageUrl?: string | null
    pivot?: {
      quantite: number
      ordre?: number | null
      disponible: boolean
    }
  }>
}

export interface AdminProduit {
  id: number
  nom: string
  description?: string | null
  prix: number
  categorie: string
  active: boolean
  imageUrl?: string | null
  imagePath?: string | null
  createdAt: string
  updatedAt: string
  entreprises?: Array<{
    id: number
    nom: string
  }>
}

// Admin - Entreprises
export const useAdminEntreprises = () => {
  return useQuery({
    queryKey: ['admin-entreprises'],
    queryFn: async () => {
      const response = await apiRequest('/api/admin/entreprises')
      return response.entreprises || []
    },
  })
}

export const useCreateEntreprise = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Omit<AdminEntreprise, 'id' | 'createdAt' | 'updatedAt'>) => {
      return apiRequest('/api/admin/entreprises', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-entreprises'] })
    },
  })
}

export const useUpdateEntreprise = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<AdminEntreprise> }) => {
      return apiRequest(`/api/admin/entreprises/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-entreprises'] })
    },
  })
}

export const useDeleteEntreprise = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/entreprises/${id}`, {
        method: 'DELETE',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-entreprises'] })
    },
  })
}

// Admin - Utilisateurs
export const useAdminUsers = () => {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const response = await apiRequest('/api/admin/users')
      return response.users || []
    },
  })
}

export const useCreateUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { username: string; password: string; role: 'admin' | 'entreprise'; entrepriseId?: number }) => {
      return apiRequest('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })
}

export const useUpdateUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<{ username: string; email: string; password?: string; role: 'admin' | 'entreprise'; entrepriseId?: number }> }) => {
      return apiRequest(`/api/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })
}

export const useDeleteUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/users/${id}`, {
        method: 'DELETE',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })
}

// Admin - Menus
export const useAdminMenus = () => {
  return useQuery({
    queryKey: ['admin-menus'],
    queryFn: async () => {
      const response = await apiRequest('/api/admin/menus')
      return response.menus || []
    },
  })
}

export const useCreateMenu = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { menuData: Omit<AdminMenu, 'id' | 'createdAt' | 'updatedAt'>; image?: File }) => {
      // 1. Créer le menu sans image
      const menuResponse = await apiRequest('/api/admin/menus', {
        method: 'POST',
        body: JSON.stringify(data.menuData),
      })
      
      // 2. Upload l'image si fournie
      if (data.image && menuResponse.menu?.id) {
        const formData = new FormData()
        formData.append('image', data.image)
        
        await apiRequest(`/api/menus/${menuResponse.menu.id}/image`, {
          method: 'POST',
          body: formData,
        })
      }
      
      return menuResponse
    },
    onSuccess: () => {
      // Invalider toutes les queries liées aux menus
      queryClient.invalidateQueries({ queryKey: ['admin-menus'] })
      queryClient.invalidateQueries({ queryKey: ['public-menus'] })
      queryClient.invalidateQueries({ queryKey: ['entreprise-menus'] })
      queryClient.invalidateQueries({ queryKey: ['menus'] })
    },
  })
}

export const useUpdateMenu = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { menuData: Partial<AdminMenu>; image?: File } }) => {
      // 1. Mettre à jour le menu
      const menuResponse = await apiRequest(`/api/admin/menus/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data.menuData),
      })
      
      // 2. Upload l'image si fournie
      if (data.image) {
        const formData = new FormData()
        formData.append('image', data.image)
        
        await apiRequest(`/api/menus/${id}/image`, {
          method: 'POST',
          body: formData,
        })
      }
      
      return menuResponse
    },
    onSuccess: () => {
      // Invalider toutes les queries liées aux menus
      queryClient.invalidateQueries({ queryKey: ['admin-menus'] })
      queryClient.invalidateQueries({ queryKey: ['public-menus'] })
      queryClient.invalidateQueries({ queryKey: ['entreprise-menus'] })
      queryClient.invalidateQueries({ queryKey: ['menus'] })
    },
  })
}

export const useDeleteMenu = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/menus/${id}`, {
        method: 'DELETE',
      })
    },
    onSuccess: () => {
      // Invalider toutes les queries liées aux menus
      queryClient.invalidateQueries({ queryKey: ['admin-menus'] })
      queryClient.invalidateQueries({ queryKey: ['public-menus'] })
      queryClient.invalidateQueries({ queryKey: ['entreprise-menus'] })
      queryClient.invalidateQueries({ queryKey: ['menus'] })
    },
  })
}

// Admin - Produits
export const useAdminProduits = () => {
  return useQuery({
    queryKey: ['admin-produits'],
    queryFn: async () => {
      const response = await apiRequest('/api/admin/produits')
      return response.produits || []
    },
  })
}

export const useCreateProduit = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { produitData: Omit<AdminProduit, 'id' | 'createdAt' | 'updatedAt'>; image?: File }) => {
      // 1. Créer le produit sans image
      const produitResponse = await apiRequest('/api/admin/produits', {
        method: 'POST',
        body: JSON.stringify(data.produitData),
      })
      
      // 2. Upload l'image si fournie
      if (data.image && produitResponse.produit?.id) {
        const formData = new FormData()
        formData.append('image', data.image)
        
        await apiRequest(`/api/produits/${produitResponse.produit.id}/image`, {
          method: 'POST',
          body: formData,
        })
      }
      
      return produitResponse
    },
    onSuccess: () => {
      // Invalider toutes les queries liées aux produits
      queryClient.invalidateQueries({ queryKey: ['admin-produits'] })
      queryClient.invalidateQueries({ queryKey: ['public-produits'] })
      queryClient.invalidateQueries({ queryKey: ['entreprise-produits'] })
      queryClient.invalidateQueries({ queryKey: ['produits'] })
    },
  })
}

export const useUpdateProduit = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { produitData: Partial<AdminProduit>; image?: File } }) => {
      // 1. Mettre à jour le produit
      const produitResponse = await apiRequest(`/api/admin/produits/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data.produitData),
      })
      
      // 2. Upload l'image si fournie
      if (data.image) {
        const formData = new FormData()
        formData.append('image', data.image)
        
        await apiRequest(`/api/produits/${id}/image`, {
          method: 'POST',
          body: formData,
        })
      }
      
      return produitResponse
    },
    onSuccess: () => {
      // Invalider toutes les queries liées aux produits
      queryClient.invalidateQueries({ queryKey: ['admin-produits'] })
      queryClient.invalidateQueries({ queryKey: ['public-produits'] })
      queryClient.invalidateQueries({ queryKey: ['entreprise-produits'] })
      queryClient.invalidateQueries({ queryKey: ['produits'] })
    },
  })
}

export const useDeleteProduit = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/produits/${id}`, {
        method: 'DELETE',
      })
    },
    onSuccess: () => {
      // Invalider toutes les queries liées aux produits
      queryClient.invalidateQueries({ queryKey: ['admin-produits'] })
      queryClient.invalidateQueries({ queryKey: ['public-produits'] })
      queryClient.invalidateQueries({ queryKey: ['entreprise-produits'] })
      queryClient.invalidateQueries({ queryKey: ['produits'] })
    },
  })
}

// ========== HOOKS POUR DISPONIBILITÉ DES EMPLOYÉS ==========

export interface EmployeeAvailability {
  available: boolean
  count: number
  message?: string
}

// Hook pour vérifier la disponibilité des employés
export const useEmployeeAvailability = () => {
  return useQuery({
    queryKey: ['employee-availability'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/availability/check')
        console.log('🔍 API Response:', response) // Debug log
        return {
          available: response.available !== false, // Utiliser la valeur de l'API
          count: response.count || 0,
          message: response.message
        } as EmployeeAvailability
      } catch (error: any) {
        console.error('❌ API Error:', error) // Debug log
        // Si l'API retourne une erreur 503 (service indisponible)
        if (error.status === 503) {
          // Pour les erreurs 503, essayer de parser la réponse
          try {
            const errorData = typeof error.data === 'string' ? JSON.parse(error.data) : error.data
            return {
              available: false,
              count: 0,
              message: errorData?.message || "Aucun employé n'est actuellement disponible"
            } as EmployeeAvailability
          } catch {
            return {
              available: false,
              count: 0,
              message: "Aucun employé n'est actuellement disponible"
            } as EmployeeAvailability
          }
        }
        // Pour d'autres erreurs, on assume que le service est disponible
        console.error('Erreur API availability:', error)
        return {
          available: true,
          count: 0,
          message: 'Erreur lors de la vérification'
        } as EmployeeAvailability
      }
    },
    refetchInterval: 5000, // Rafraîchir toutes les 5 secondes (temporaire pour debug)
    staleTime: 1000, // Considérer les données comme obsolètes après 1 seconde
    refetchOnWindowFocus: true, // Rafraîchir quand la fenêtre reprend le focus
  })
}

// ========== HOOKS POUR RELATIONS MENU-PRODUITS ==========

// Hook pour récupérer les produits d'un menu spécifique (ADMIN)
export const useMenuProduits = (menuId: number, enabled = true) => {
  return useQuery({
    queryKey: ['menu-produits', menuId],
    queryFn: async () => {
      const response = await apiRequest(`/api/admin/menus/${menuId}/produits`)
      return response.produits || []
    },
    enabled: enabled && !!menuId,
  })
}

// Hook pour ajouter un produit à un menu
export const useAddProduitToMenu = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ 
      menuId, 
      produitId, 
      quantite = 1, 
      ordre = null, 
      disponible = true 
    }: { 
      menuId: number; 
      produitId: number; 
      quantite?: number; 
      ordre?: number | null; 
      disponible?: boolean 
    }) => {
      return apiRequest(`/api/menus/${menuId}/produits`, {
        method: 'POST',
        body: JSON.stringify({
          produitId,
          quantite,
          ordre,
          disponible,
        }),
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['menu-produits', variables.menuId] })
      queryClient.invalidateQueries({ queryKey: ['admin-menus'] })
    },
  })
}

// Hook pour mettre à jour un produit dans un menu
export const useUpdateProduitInMenu = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ 
      menuId, 
      produitId, 
      quantite, 
      ordre, 
      disponible 
    }: { 
      menuId: number; 
      produitId: number; 
      quantite?: number; 
      ordre?: number | null; 
      disponible?: boolean 
    }) => {
      return apiRequest(`/api/menus/${menuId}/produits/${produitId}`, {
        method: 'PUT',
        body: JSON.stringify({
          quantite,
          ordre,
          disponible,
        }),
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['menu-produits', variables.menuId] })
      queryClient.invalidateQueries({ queryKey: ['admin-menus'] })
    },
  })
}

// Hook pour retirer un produit d'un menu
export const useRemoveProduitFromMenu = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ menuId, produitId }: { menuId: number; produitId: number }) => {
      return apiRequest(`/api/menus/${menuId}/produits/${produitId}`, {
        method: 'DELETE',
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['menu-produits', variables.menuId] })
      queryClient.invalidateQueries({ queryKey: ['admin-menus'] })
    },
  })
}

// Mutation spécialisée pour mettre à jour les associations menu-entreprises
export const useUpdateMenuEntreprises = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ menuId, entrepriseIds }: { menuId: number; entrepriseIds: number[] }) => {
      return apiRequest(`/api/admin/menus/${menuId}`, {
        method: 'PUT',
        body: JSON.stringify({ entrepriseIds }),
      })
    },
    onSuccess: () => {
      // Invalider toutes les queries liées aux menus
      queryClient.invalidateQueries({ queryKey: ['admin-menus'] })
      queryClient.invalidateQueries({ queryKey: ['admin-entreprises'] })
      queryClient.invalidateQueries({ queryKey: ['public-menus'] })
      queryClient.invalidateQueries({ queryKey: ['entreprise-menus'] })
      queryClient.invalidateQueries({ queryKey: ['menus'] })
      
      // Invalider aussi les produits car ils peuvent être affectés par les associations
      queryClient.invalidateQueries({ queryKey: ['public-produits'] })
      queryClient.invalidateQueries({ queryKey: ['entreprise-produits'] })
      queryClient.invalidateQueries({ queryKey: ['produits'] })
    },
  })
}