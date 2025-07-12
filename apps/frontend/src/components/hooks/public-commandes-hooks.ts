import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { API_BASE_URL } from '@/lib/config'

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
  entreprise_id: number
  produits: {
    produit_id: number
    quantite: number
  }[]
  telephone_livraison: string
  creneaux_livraison: CreneauLivraison[]
  notes_commande?: string
}

export interface CommandeResponse {
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

// Hooks pour les entreprises publiques
export function usePublicEntreprises() {
  return useQuery({
    queryKey: ['public-entreprises'],
    queryFn: async (): Promise<PublicEntreprise[]> => {
      const response = await fetch(`${API_BASE_URL}/api/commandes/entreprises`)
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des entreprises')
      }
      const data = await response.json()
      return data.entreprises
    },
  })
}

export function usePublicEntreprise(id: number) {
  return useQuery({
    queryKey: ['public-entreprise', id],
    queryFn: async (): Promise<PublicEntreprise> => {
      const response = await fetch(`${API_BASE_URL}/api/commandes/entreprises/${id}`)
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération de l\'entreprise')
      }
      const data = await response.json()
      return data.entreprise
    },
    enabled: !!id,
  })
}

// Hook pour créer une commande publique
export function useCreatePublicCommande() {
  return useMutation({
    mutationFn: async (data: CreateCommandeData): Promise<CommandeResponse> => {
      const response = await fetch(`${API_BASE_URL}/api/commandes/public`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erreur lors de la création de la commande')
      }

      const result = await response.json()
      return result.commande
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
      const response = await fetch(`${API_BASE_URL}/api/commandes/statut/${numeroCommande}`)
      if (!response.ok) {
        throw new Error('Commande non trouvée')
      }
      const data = await response.json()
      return data.commande
    },
    enabled: !!numeroCommande,
  })
}
