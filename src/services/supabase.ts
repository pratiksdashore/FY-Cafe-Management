import { createClient } from '@supabase/supabase-js';
import { CustomizationOption } from '@/types/food';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Real-time subscription helpers
export const subscribeToOrders = (userId: string, callback: (payload: any) => void) => {
    return supabase
        .channel('orders')
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'orders',
                filter: `user_id=eq.${userId}`,
            },
            callback
        )
        .subscribe();
};

export const subscribeToTokens = (orderId: string, callback: (payload: any) => void) => {
    return supabase
        .channel('tokens')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'tokens',
                filter: `order_id=eq.${orderId}`,
            },
            callback
        )
        .subscribe();
};

export const subscribeToMenuItems = (vendorId: string, callback: (payload: any) => void) => {
    return supabase
        .channel('menu_items')
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'menu_items',
                filter: `vendor_id=eq.${vendorId}`,
            },
            callback
        )
        .subscribe();
};

export const subscribeToSurplusFood = (callback: (payload: any) => void) => {
    return supabase
        .channel('surplus_food')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'surplus_food',
            },
            callback
        )
        .subscribe();
};

// Menu Item Customization helpers
export const menuCustomizationService = {
    getCustomizations: async (menuItemId: string): Promise<CustomizationOption[]> => {
        const { data, error } = await supabase
            .from('customization_options')
            .select('*')
            .eq('menu_item_id', menuItemId)
            .eq('is_available', true)
            .order('name');

        if (error) throw error;
        return (data || []).map(opt => ({
            id: opt.id,
            name: opt.name,
            price: Number(opt.price),
            isAvailable: opt.is_available
        }));
    }
};

// Authentication helpers
export const authService = {
    // Sign up with email and password
    signUpWithEmail: async (email: string, password: string, fullName: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                }
            }
        });

        if (error) throw error;
        return data;
    },

    // Sign in with email and password
    signInWithEmail: async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;
        return data;
    },

    // Sign out
    signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    // Get current user
    getCurrentUser: async () => {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    },

    // Get current session
    getSession: async () => {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        return session;
    },

    // Listen to auth state changes
    onAuthStateChange: (callback: (event: string, session: any) => void) => {
        return supabase.auth.onAuthStateChange(callback);
    },

    // Reset password
    resetPassword: async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
    },

    // Update password
    updatePassword: async (newPassword: string) => {
        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });
        if (error) throw error;
    },
};

// Cart helpers
export const cartService = {
    // Get all cart items for the current user
    getCartItems: async (userId: string) => {
        const { data, error } = await supabase
            .from('cart_items')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    // Add item to cart
    addCartItem: async (userId: string, menuItem: any, quantity: number = 1, notes?: string, selectedCustomizations: any[] = []) => {
        // Check if item already exists with the SAME customizations
        const { data: existing } = await supabase
            .from('cart_items')
            .select('*')
            .eq('user_id', userId)
            .eq('menu_item_id', menuItem.id)
            .eq('selected_customizations', JSON.stringify(selectedCustomizations)) // This is a bit naive for JSONB matching but works for simple arrays
            .maybeSingle();

        if (existing) {
            // Update quantity if item exists
            const { data, error } = await supabase
                .from('cart_items')
                .update({
                    quantity: existing.quantity + quantity,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } else {
            // Insert new item
            const { data, error } = await supabase
                .from('cart_items')
                .insert({
                    user_id: userId,
                    menu_item_id: menuItem.id,
                    menu_item_data: menuItem,
                    selected_customizations: selectedCustomizations,
                    quantity,
                    notes
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        }
    },

    // Update cart item customizations
    updateCartItemCustomizations: async (cartItemId: string, selectedCustomizations: any[]) => {
        const { data, error } = await supabase
            .from('cart_items')
            .update({
                selected_customizations: selectedCustomizations,
                updated_at: new Date().toISOString()
            })
            .eq('id', cartItemId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Update cart item quantity
    updateCartItem: async (cartItemId: string, quantity: number) => {
        const { data, error } = await supabase
            .from('cart_items')
            .update({
                quantity,
                updated_at: new Date().toISOString()
            })
            .eq('id', cartItemId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Remove item from cart
    removeCartItem: async (cartItemId: string) => {
        const { error } = await supabase
            .from('cart_items')
            .delete()
            .eq('id', cartItemId);

        if (error) throw error;
    },

    // Clear all cart items for user
    clearCart: async (userId: string) => {
        const { error } = await supabase
            .from('cart_items')
            .delete()
            .eq('user_id', userId);

        if (error) throw error;
    },

    // Subscribe to cart changes
    subscribeToCart: (userId: string, callback: (payload: any) => void) => {
        return supabase
            .channel('cart_items')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'cart_items',
                    filter: `user_id=eq.${userId}`,
                },
                callback
            )
            .subscribe();
    },
};

// Order helpers
export const orderService = {
    // Help to pick the chef with the minimum workload
    pickBestChef: async () => {
        const { data: chefs } = await supabase
            .from('chefs')
            .select('*')
            .eq('is_available', true)
            .order('current_assigned_orders', { ascending: true })
            .limit(1);
        return chefs && chefs.length > 0 ? chefs[0] : null;
    },

    // Create a new order and return it
    createOrder: async (userId: string, totalAmount: number, phone: string, estimatedReadyAt?: Date, paymentId?: string, scheduledAt?: Date) => {
        const tokenNumber = Math.floor(1000 + Math.random() * 9000);

        // For pre-orders, don't assign a chef yet — assign when the order becomes active
        const bestChef = scheduledAt ? null : await orderService.pickBestChef();

        const { data, error } = await supabase
            .from('orders')
            .insert({
                user_id: userId,
                token_number: tokenNumber,
                status: 'PLACED',
                total_amount: totalAmount,
                phone,
                chef_id: bestChef?.id || null,
                estimated_ready_at: estimatedReadyAt ? estimatedReadyAt.toISOString() : null,
                scheduled_at: scheduledAt ? scheduledAt.toISOString() : null,
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // Calculate dynamic wait time using chef-specific queue workload
    calculateWaitTime: async (items: any[]) => {
        try {
            // 1. Pick the best chef (lowest workload)
            const targetChef = await orderService.pickBestChef();

            // Calculate base prep time for the new order (using corrected property name: prepTime)
            const newOrderPrepTime = items.reduce((sum, item) => sum + (item.prepTime || 15), 0);

            if (!targetChef) return Math.ceil(newOrderPrepTime);

            // 2. Fetch all active orders for THIS specific chef to find their "busy until" time
            const { data: chefOrders } = await supabase
                .from('orders')
                .select('id, estimated_ready_at')
                .eq('chef_id', targetChef.id)
                .in('status', ['PLACED', 'PREPARING'])
                .order('estimated_ready_at', { ascending: false })
                .limit(1);

            const now = new Date();
            let chefBusyUntilMs = now.getTime();

            if (chefOrders && chefOrders.length > 0 && chefOrders[0].estimated_ready_at) {
                const latestOrderReadyAt = new Date(chefOrders[0].estimated_ready_at);
                // Chef is busy until the last assigned order is finished
                chefBusyUntilMs = Math.max(now.getTime(), latestOrderReadyAt.getTime());
            }

            // 3. Backlog is the gap between now and when the chef is free
            const backlogMinutes = (chefBusyUntilMs - now.getTime()) / 60000;

            // Final wait time is when the chef finishes current work + new prep time
            const finalWaitMinutes = Math.ceil(backlogMinutes + newOrderPrepTime);

            return finalWaitMinutes;
        } catch (error) {
            console.error('Error calculating wait time:', error);
            // Fallback using corrected property name
            return Math.ceil(items.reduce((sum, item) => sum + (item.prepTime || 15), 0));
        }
    },

    // Create order items for an order
    createOrderItems: async (orderId: string, items: Array<{
        menu_item_id: string;
        menu_item_data: any;
        quantity: number;
        unit_price: number;
    }>) => {
        const rows = items.map((item) => ({
            order_id: orderId,
            menu_item_id: item.menu_item_id,
            menu_item_data: item.menu_item_data,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.unit_price * item.quantity,
        }));
        const { data, error } = await supabase
            .from('order_items')
            .insert(rows)
            .select();
        if (error) throw error;
        return data;
    },

    // Get all orders for a user (with order items)
    getUserOrders: async (userId: string) => {
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (*)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    // Get ALL orders (for admin)
    getAllOrders: async () => {
        const { data, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_items (*)
            `)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    // Update order status (admin)
    updateOrderStatus: async (orderId: string, status: string, estimatedReadyAt?: string) => {
        const updatePayload: Record<string, any> = { status, updated_at: new Date().toISOString() };
        if (estimatedReadyAt) updatePayload.estimated_ready_at = estimatedReadyAt;
        const { data, error } = await supabase
            .from('orders')
            .update(updatePayload)
            .eq('id', orderId)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // Cancel an order
    cancelOrder: async (orderId: string) => {
        const { data, error } = await supabase
            .from('orders')
            .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
            .eq('id', orderId)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // Real-time subscription for a user's orders
    subscribeToUserOrders: (userId: string, callback: (payload: any) => void) => {
        return supabase
            .channel(`orders_${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                    filter: `user_id=eq.${userId}`,
                },
                callback
            )
            .subscribe();
    },

    // Real-time subscription for ALL orders (admin)
    subscribeToAllOrders: (callback: (payload: any) => void) => {
        return supabase
            .channel('all_orders')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                },
                callback
            )
            .subscribe();
    },
};

// Rating helpers
export const ratingService = {
    // Submit a new rating for a food item
    submitRating: async (params: {
        menu_item_id: string;
        order_id?: string;
        rating: number;
        comment?: string;
        is_anonymous?: boolean;
    }) => {
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
            .from('food_ratings')
            .upsert(
                {
                    menu_item_id: params.menu_item_id,
                    order_id: params.order_id ?? null,
                    user_id: user?.id ?? null,
                    rating: params.rating,
                    comment: params.comment ?? null,
                    is_anonymous: params.is_anonymous ?? false,
                },
                {
                    onConflict: 'menu_item_id,order_id,user_id',
                    ignoreDuplicates: false,
                }
            )
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // Get average rating and count for a menu item
    getMenuItemRating: async (menuItemId: string) => {
        const { data, error } = await supabase
            .from('menu_items')
            .select('avg_rating, rating_count')
            .eq('id', menuItemId)
            .single();
        if (error) throw error;
        return data as { avg_rating: number; rating_count: number };
    },

    // Get all reviews for a menu item
    getMenuItemReviews: async (menuItemId: string) => {
        const { data, error } = await supabase
            .from('food_ratings')
            .select('*')
            .eq('menu_item_id', menuItemId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    // Check if a user has already rated an item for a given order
    hasRated: async (menuItemId: string, orderId: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;
        const { data } = await supabase
            .from('food_ratings')
            .select('id')
            .eq('menu_item_id', menuItemId)
            .eq('order_id', orderId)
            .eq('user_id', user.id)
            .maybeSingle();
        return !!data;
    },
};
// Recommendation helpers
export const recommendationService = {
  // Save recommendations for a user
  saveUserRecommendations: async (userId: string, recommendations: string[]) => {
    const { data, error } = await supabase
      .from('user_recommendations')
      .upsert({
        user_id: userId,
        recommendations: recommendations,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get stored recommendations for a user
  getStoredRecommendations: async (userId: string): Promise<string[]> => {
    const { data, error } = await supabase
      .from('user_recommendations')
      .select('recommendations')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data?.recommendations || [];
  }
};
