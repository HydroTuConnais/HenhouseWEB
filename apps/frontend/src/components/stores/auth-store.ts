import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/query-client'

export interface Entreprise {
  id: number
  nom: string
  adresse: string
  telephone: string
  email: string
  active: boolean
}

export interface User {
  id: number
  username: string
  role: 'entreprise' | 'admin'
  entreprise?: Entreprise
  entrepriseId?: number
}

export interface AuthResponse {
  message: string
  user: User
}

// Query keys pour l'authentification
export const authQueryKeys = {
  me: ['auth', 'me'] as const,
}

// Hook pour récupérer les informations de l'utilisateur connecté
export const useMe = () => {
  return useQuery({
    queryKey: authQueryKeys.me,
    queryFn: async (): Promise<AuthResponse> => {
      return await apiRequest('/api/auth/me')
    },
    retry: (failureCount, error: any) => {
      // Ne pas retry si c'est une erreur 401 (non authentifié)
      if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
        return false
      }
      return failureCount < 3
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Hook pour la connexion
export const useLogin = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }): Promise<AuthResponse> => {
      return await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })
    },
    onSuccess: (data) => {
      // Mettre à jour le cache avec les données utilisateur
      queryClient.setQueryData(authQueryKeys.me, data)
      
      // Invalider les autres queries pour forcer un refetch avec les nouvelles données d'auth
      queryClient.invalidateQueries({ 
        predicate: (query) => !query.queryKey.includes('auth')
      })
    },
    onError: (error) => {
      console.error('Erreur de connexion:', error)
    }
  })
}

// Hook pour la déconnexion
export const useLogout = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/auth/logout', {
        method: 'POST',
      })
    },
    onSuccess: () => {
      // Vider tout le cache pour une déconnexion propre
      queryClient.clear()
    },
    onError: () => {
      // Même si le logout échoue côté serveur, on vide le cache côté client
      queryClient.clear()
    }
  })
}

// Helper pour récupérer l'ID de l'entreprise de l'utilisateur connecté
export const useEntrepriseId = () => {
  const { data: me } = useMe()
  return me?.user?.entreprise?.id || me?.user?.entrepriseId
}

// Helper pour vérifier si l'utilisateur est admin
export const useIsAdmin = () => {
  const { data: me } = useMe()
  return me?.user?.role === 'admin'
}

// Helper pour vérifier si l'utilisateur appartient à une entreprise
export const useHasEntreprise = () => {
  const { data: me } = useMe()
  return !!me?.user?.entreprise || !!me?.user?.entrepriseId
}

// Helper pour vérifier si l'utilisateur est authentifié
export const useIsAuthenticated = () => {
  const { data: me, isSuccess, isLoading } = useMe()
  return { 
    isAuthenticated: isSuccess && !!me?.user, 
    isLoading,
    user: me?.user 
  }
}
