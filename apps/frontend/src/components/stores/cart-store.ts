import { Store } from '@tanstack/store'

export interface CartItem {
  id: number
  nom: string
  prix: number
  quantite: number
  imageUrl?: string
  type: 'produit' | 'menu'
}

export interface CartState {
  items: CartItem[]
  isOpen: boolean
}

const initialState: CartState = {
  items: [],
  isOpen: false
}

export const cartStore = new Store(initialState)

export const cartActions = {
  addItem: (item: Omit<CartItem, 'quantite'>) => {
    cartStore.setState((state) => {
      const existingItem = state.items.find(i => i.id === item.id && i.type === item.type)
      
      if (existingItem) {
        return {
          ...state,
          items: state.items.map(i =>
            i.id === item.id && i.type === item.type
              ? { ...i, quantite: i.quantite + 1 }
              : i
          )
        }
      } else {
        return {
          ...state,
          items: [...state.items, { ...item, quantite: 1 }]
        }
      }
    })
  },

  removeItem: (id: number, type: 'menu' | 'produit') => {
    cartStore.setState((state) => ({
      ...state,
      items: state.items.filter(i => !(i.id === id && i.type === type))
    }))
  },

  updateQuantity: (id: number, type: 'menu' | 'produit', quantite: number) => {
    if (quantite <= 0) {
      cartActions.removeItem(id, type)
      return
    }
    cartStore.setState((state) => ({
      ...state,
      items: state.items.map(i =>
        i.id === id && i.type === type ? { ...i, quantite } : i
      )
    }))
  },

  toggleCart: () => {
    cartStore.setState((state) => ({
      ...state,
      isOpen: !state.isOpen
    }))
  },

  setCartOpen: (isOpen: boolean) => {
    cartStore.setState((state) => ({
      ...state,
      isOpen
    }))
  },

  clearCart: () => {
    cartStore.setState((state) => ({
      ...state,
      items: []
    }))
  }
}

export const getCartTotal = (state: CartState) => 
  state.items.reduce((sum, item) => sum + (item.prix * item.quantite), 0)

export const getCartItemCount = (state: CartState) => 
  state.items.reduce((sum, item) => sum + item.quantite, 0)