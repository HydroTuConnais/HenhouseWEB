import { useStore } from '@tanstack/react-store'
import { cartStore, cartActions, getCartTotal, getCartItemCount } from '@/components/stores/cart-store'

export const useCart = () => {
  const state = useStore(cartStore)
  
  return {
    items: state.items,
    isOpen: state.isOpen,
    total: getCartTotal(state),
    itemCount: getCartItemCount(state),
    addItem: cartActions.addItem,
    removeItem: cartActions.removeItem,
    updateQuantity: cartActions.updateQuantity,
    toggleCart: cartActions.toggleCart,
    setCartOpen: cartActions.setCartOpen,
    clearCart: cartActions.clearCart
  }
}