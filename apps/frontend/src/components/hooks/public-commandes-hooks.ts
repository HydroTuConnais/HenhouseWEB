import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiRequest } from '@/lib/query-client'

// Types
export interface PublicEntreprise {
  id: number
  nom: string
  description: string | null
  adresse: string | null
  telephone: string | null
  email: string | null
  active: boolean
  menus: PublicMenu[]
}

export interface PublicMenu {
  id: number
  nom: string
  description: string | null
  prix: number
  active: boolean
  imageUrl: string | null
  produits: PublicProduit[]
}

export interface PublicProduit {
  id: number
  nom: string
  description: string | null
  prix: number
  categorie: string
  active: boolean
  imageUrl: string | null
  pivot?: {
    quantite: number
    ordre: number | null
    disponible: boolean
  }
}

export interface CreneauLivraison {
  jour_debut: string
  heure_debut: string
  jour_fin: string
  heure_fin: string
}

export interface CreateCommandeData {
  entreprise_id: number | null
  produits?: {
    produit_id: number
    quantite: number
  }[]
  items?: {
    type: 'menu' | 'produit'
    itemId: number
    quantite: number
  }[]
  telephone_livraison: string
  creneaux_livraison: CreneauLivraison[]
  notes_commande?: string
}

export interface CommandeResponse {
    menus: CommandeMenu[]
  items: Array<{
    type: 'menu' | 'produit'
    itemId: number
    quantite: number
  }>
  type_livraison: string
  id: number
  numeroCommande: string
  statut: string
  total: number
  telephoneLivraison: string
  creneauxLivraison: string
  notesCommande: string | null
  entreprise: PublicEntreprise
  produits: PublicProduit[]
  createdAt: string
  updatedAt: string
}

export interface CommandeMenu {
  id: number
  nom: string
  prix: number
  produits: {
    id: number
    nom: string
    prix: number
    quantite: number
  }[]
}

// Hooks pour les entreprises publiques
export function usePublicEntreprises() {
  return useQuery({
    queryKey: ['public-entreprises'],
    queryFn: async (): Promise<PublicEntreprise[]> => {
      const data = await apiRequest('/api/commandes/entreprises')
      return data.entreprises
    },
  })
}

export function usePublicEntreprise(id: number) {
  return useQuery({
    queryKey: ['public-entreprise', id],
    queryFn: async (): Promise<PublicEntreprise> => {
      const data = await apiRequest(`/api/commandes/entreprises/${id}`)
      return data.entreprise
    },
    enabled: !!id,
  })
}

// Hook pour créer une commande publique
export function useCreatePublicCommande() {
  return useMutation({
    mutationFn: async (data: CreateCommandeData): Promise<{ commande: CommandeResponse; numeroCommande: string }> => {
      return apiRequest('/api/commandes/public', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },
    onSuccess: (data) => {
      toast.success(`Commande créée avec succès ! Numéro: ${data.numeroCommande}`)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// Hook pour récupérer le statut d'une commande
export function useCommandeStatut(numeroCommande: string) {
  return useQuery({
    queryKey: ['commande-statut', numeroCommande],
    queryFn: async (): Promise<CommandeResponse> => {
      const data = await apiRequest(`/api/commandes/statut/${numeroCommande}`)
      return data.commande
    },
    enabled: !!numeroCommande,
  })
}

// Hook pour récupérer le statut d'une commande avec vérification téléphone
export function useCommandeStatutWithPhone(numeroCommande: string, telephone: string) {
  return useQuery({
    queryKey: ['commande-statut-phone', numeroCommande, telephone],
    queryFn: async (): Promise<CommandeResponse> => {
      const data = await apiRequest(`/api/commandes/statut/${numeroCommande}?telephone=${encodeURIComponent(telephone)}`)
      return data.commande
    },
    enabled: !!numeroCommande && !!telephone,
  })
}
