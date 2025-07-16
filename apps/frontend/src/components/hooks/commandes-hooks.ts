import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/query-client'

// Types basés sur le modèle backend Commande
export interface CommandeProduit {
  id: number
  nom: string
  description?: string
  prix: number
  categorie: string
  imageUrl?: string
  fullImageUrl?: string
  pivot: {
    quantite: number
    prix_unitaire: number
  }
}

export interface CommandeMenu {
  id: number
  nom: string
  description?: string
  prix: number
  imageUrl?: string
  fullImageUrl?: string
  pivot: {
    quantite: number
    prix_unitaire: number
  }
  produits?: {
    id: number
    nom: string
    description?: string
    prix: number
    categorie: string
  }[]
}

export interface Commande {
  id: number
  numeroCommande: string
  statut: 'en_attente' | 'confirmee' | 'en_preparation' | 'prete' | 'livree' | 'annulee'
  total: number
  userId: number
  entrepriseId: number
  dateLivraison?: string
  createdAt: string
  updatedAt: string
  user?: {
    id: number
    username: string
  }
  entreprise?: {
    id: number
    nom: string
  }
  produits: CommandeProduit[]
  menus?: CommandeMenu[]
}

export interface CreateCommandeRequest {
  produits: Array<{
    produit_id: number
    quantite: number
  }>
  telephone_livraison?: string
  creneaux_livraison?: Array<{
    jour_debut: string
    heure_debut: string
    jour_fin: string
    heure_fin: string
  }>
  notes_commande?: string
  entreprise_id?: number
  type_livraison?: 'livraison' | 'click_and_collect'
}

// Query keys pour les commandes
export const commandesQueryKeys = {
  all: ['commandes'] as const,
  list: () => [...commandesQueryKeys.all, 'list'] as const,
  detail: (id: number) => [...commandesQueryKeys.all, 'detail', id] as const,
  userCommandes: (userId: number) => [...commandesQueryKeys.all, 'user', userId] as const,
}

// Hook pour récupérer toutes les commandes (selon le rôle de l'utilisateur)
export const useCommandes = () => {
  return useQuery({
    queryKey: commandesQueryKeys.list(),
    queryFn: async (): Promise<Commande[]> => {
      const response = await apiRequest('/api/commandes')
      return response.commandes || []
    },
  })
}

// Hook pour récupérer une commande spécifique
export const useCommande = (id: number, enabled = true) => {
  return useQuery({
    queryKey: commandesQueryKeys.detail(id),
    queryFn: async (): Promise<Commande> => {
      const response = await apiRequest(`/api/commandes/${id}`)
      return response.commande
    },
    enabled: enabled && !!id,
  })
}

// Hook pour récupérer les commandes d'un utilisateur (dashboard utilisateur)
export const useUserCommandes = () => {
  return useQuery({
    queryKey: commandesQueryKeys.list(),
    queryFn: async (): Promise<Commande[]> => {
      const response = await apiRequest('/api/commandes')
      return response.commandes || []
    },
  })
}

// Hook pour créer une nouvelle commande
export const useCreateCommande = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: CreateCommandeRequest): Promise<Commande> => {
      const response = await apiRequest('/api/commandes', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      return response.commande
    },
    onSuccess: () => {
      // Invalider les queries de commandes pour refetch les données
      queryClient.invalidateQueries({ queryKey: commandesQueryKeys.all })
    },
  })
}

// Hook pour mettre à jour le statut d'une commande
export const useUpdateCommandeStatut = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      statut 
    }: { 
      id: number
      statut: 'en_attente' | 'confirmee' | 'en_preparation' | 'prete' | 'livree' | 'annulee'
    }): Promise<Commande> => {
      const response = await apiRequest(`/api/commandes/${id}/statut`, {
        method: 'PATCH',
        body: JSON.stringify({ statut }),
      })
      return response.commande
    },
    onSuccess: (data) => {
      // Mettre à jour la commande spécifique dans le cache
      queryClient.setQueryData(commandesQueryKeys.detail(data.id), data)
      
      // Invalider la liste des commandes pour refetch
      queryClient.invalidateQueries({ queryKey: commandesQueryKeys.list() })
    },
  })
}

// Hook pour récupérer les commandes d'une entreprise spécifique (pour les managers)
export const useEntrepriseCommandes = (entrepriseId: number, enabled = true) => {
  return useQuery({
    queryKey: ['entreprise-commandes', entrepriseId],
    queryFn: async (): Promise<Commande[]> => {
      const response = await apiRequest(`/api/entreprises/${entrepriseId}/commandes`)
      return response.commandes || []
    },
    enabled: enabled && !!entrepriseId,
  })
}
