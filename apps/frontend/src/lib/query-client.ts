import { QueryClient } from '@tanstack/react-query'
import { API_BASE_URL } from './config'

// Configuration du client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
      onError: (error) => {
        console.error('Mutation error:', error)
      }
    }
  }
})

// Wrapper fetch avec credentials pour AdonisJS
export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const headers: Record<string, string> = {}
  
  // Ne pas ajouter Content-Type si c'est FormData (pour les uploads)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const config: RequestInit = {
    ...options,
    credentials: 'include',
    headers: {
      ...headers,
      ...options.headers,
    },
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config)
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `HTTP ${response.status}`)
  }
  
  return response.json()
}