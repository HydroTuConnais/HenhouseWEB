import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/query-client'
import { authQueryKeys } from '@/components/stores/auth-store'

// Types pour les mutations utilisateur
export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface UpdateUserProfileRequest {
  username?: string
  email?: string
}

// Hook pour changer le mot de passe
export const useChangePassword = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: ChangePasswordRequest): Promise<{ message: string }> => {
      const response = await apiRequest('/api/auth/change-password', {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
      return response
    },
    onSuccess: () => {
      // Optionnel: invalider les données utilisateur si nécessaire
      queryClient.invalidateQueries({ queryKey: authQueryKeys.me })
    },
  })
}

// Hook pour mettre à jour le profil utilisateur
export const useUpdateProfile = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: UpdateUserProfileRequest): Promise<{ message: string; user: any }> => {
      const response = await apiRequest('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
      return response
    },
    onSuccess: (data) => {
      // Mettre à jour les données utilisateur dans le cache
      queryClient.setQueryData(authQueryKeys.me, (oldData: any) => ({
        ...oldData,
        user: data.user
      }))
    },
  })
}
