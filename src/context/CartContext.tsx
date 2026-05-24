import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CartItem, MenuItem } from '@/types/food';
import { toast } from '@/hooks/use-toast';
import { useAuth } from './AuthContext';
import { cartService } from '@/services/supabase';

interface CartContextType {
  items: CartItem[];
  addItem: (item: MenuItem, quantity?: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  totalItems: number;
  totalAmount: number;
  loading: boolean;
  updateCustomizations: (itemId: string, customizations: CustomizationOption[]) => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Map database cart item to CartItem type
const mapDbCartItemToCartItem = (dbItem: any): CartItem => {
  return {
    ...dbItem.menu_item_data,
    quantity: dbItem.quantity,
    notes: dbItem.notes,
    _cartItemId: dbItem.id, // Store database ID for updates/deletes
  };
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isAuthenticated } = useAuth();

  // Load cart from database when user is authenticated
  useEffect(() => {
    const loadCart = async () => {
      if (isAuthenticated && user) {
        try {
          setLoading(true);
          const dbItems = await cartService.getCartItems(user.id);
          const cartItems = dbItems.map(mapDbCartItemToCartItem);
          setItems(cartItems);
        } catch (error) {
          console.error('Error loading cart:', error);
          toast({
            title: "Error Loading Cart",
            description: "Failed to load your cart items",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      } else {
        // Clear cart if not authenticated
        setItems([]);
        setLoading(false);
      }
    };

    loadCart();
  }, [isAuthenticated, user]);

  // Subscribe to real-time cart updates
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const subscription = cartService.subscribeToCart(user.id, (payload) => {
      console.log('Cart change:', payload);

      // Reload cart on any change
      cartService.getCartItems(user.id).then((dbItems) => {
        const cartItems = dbItems.map(mapDbCartItemToCartItem);
        setItems(cartItems);
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isAuthenticated, user]);

  const addItem = useCallback(async (item: MenuItem, quantity = 1) => {
    if (!isAuthenticated || !user) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to add items to your cart",
        variant: "destructive",
        action: (
          <button
            onClick={() => {
              window.location.href = '/signin';
            }}
            className="px-3 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Sign In
          </button>
        ),
      });
      return;
    }

    if (!item.available) {
      toast({
        title: "Item Unavailable",
        description: `${item.name} is currently out of stock`,
        variant: "destructive",
      });
      return;
    }

    try {
      const dbItem = await cartService.addCartItem(user.id, item, quantity);
      // Optimistically update local state immediately
      setItems(prev => {
        const existing = prev.find(i => i.id === item.id);
        if (existing) {
          // Item already in cart — increase quantity
          return prev.map(i =>
            i.id === item.id
              ? { ...i, quantity: i.quantity + quantity }
              : i
          );
        } else {
          // New item — append with the DB-assigned cart item id
          return [...prev, { ...item, quantity, _cartItemId: dbItem?.id }];
        }
      });
      toast({
        title: "Added to Cart",
        description: `${item.name} added to your cart`,
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
      });
    }
  }, [isAuthenticated, user]);

  const removeItem = useCallback(async (itemId: string) => {
    if (!isAuthenticated || !user) return;

    try {
      // Find the cart item by menu item ID
      const cartItem = items.find(i => i.id === itemId);
      if (!cartItem || !cartItem._cartItemId) return;

      await cartService.removeCartItem(cartItem._cartItemId);
      // Update local state immediately
      setItems(prev => prev.filter(i => i.id !== itemId));
      toast({
        title: "Item Removed",
        description: "Item removed from cart",
      });
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast({
        title: "Error",
        description: "Failed to remove item from cart",
        variant: "destructive",
      });
    }
  }, [isAuthenticated, user, items]);

  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    if (!isAuthenticated || !user) return;

    if (quantity <= 0) {
      await removeItem(itemId);
      return;
    }

    try {
      // Find the cart item by menu item ID
      const cartItem = items.find(i => i.id === itemId);
      if (!cartItem || !cartItem._cartItemId) return;

      await cartService.updateCartItem(cartItem._cartItemId, quantity);
      // Update local state immediately
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity } : i));
    } catch (error) {
      console.error('Error updating cart:', error);
      toast({
        title: "Error",
        description: "Failed to update item quantity",
        variant: "destructive",
      });
    }
  }, [isAuthenticated, user, items, removeItem]);

  const clearCart = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      await cartService.clearCart(user.id);
      // Update local state immediately
      setItems([]);
      toast({
        title: "Cart Cleared",
        description: "All items removed from cart",
      });
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast({
        title: "Error",
        description: "Failed to clear cart",
        variant: "destructive",
      });
    }
  }, [isAuthenticated, user]);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => {
    const basePrice = item.discountPercent && item.discountPercent > 0
      ? Math.round(item.price * (1 - item.discountPercent / 100))
      : item.price;

    const customizationsPrice = (item.selectedCustomizations || []).reduce((s, o) => s + o.price, 0);
    const finalPrice = basePrice + customizationsPrice;

    return sum + finalPrice * item.quantity;
  }, 0);

  const updateCustomizations = useCallback(async (itemId: string, selectedCustomizations: CustomizationOption[]) => {
    if (!isAuthenticated || !user) return;

    try {
      const cartItem = items.find(i => i.id === itemId);
      if (!cartItem || !cartItem._cartItemId) return;

      await cartService.updateCartItemCustomizations(cartItem._cartItemId, selectedCustomizations);

      // Update local state
      setItems(prev => prev.map(i =>
        i.id === itemId
          ? { ...i, selectedCustomizations }
          : i
      ));

      toast({
        title: "Cart Updated",
        description: "Customizations saved successfully",
      });
    } catch (error) {
      console.error('Error updating customizations:', error);
      toast({
        title: "Error",
        description: "Failed to update customizations",
        variant: "destructive",
      });
    }
  }, [isAuthenticated, user, items]);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalAmount,
        loading,
        updateCustomizations,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
