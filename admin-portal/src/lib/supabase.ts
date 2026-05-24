import { createClient } from '@supabase/supabase-js';
import { smsService } from './sms';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface CustomizationOption {
    id: string;
    menu_item_id: string;
    name: string;
    price: number;
    isAvailable: boolean;
}

export interface OrderItem {
    id: string;
    order_id: string;
    menu_item_id: string;
    menu_item_data: { id: string; name: string; image?: string; price: number };
    quantity: number;
    unit_price: number;
    subtotal: number;
}

export interface Order {
    id: string;
    user_id: string;
    token_number: number;
    status: 'PLACED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
    total_amount: number;
    phone?: string;
    created_at: string;
    updated_at: string;
    estimated_ready_at?: string;
    scheduled_at?: string;
    chef_id?: string;
    order_items: OrderItem[];
}

export const orderService = {
    getAllOrders: async (): Promise<Order[]> => {
        const { data, error } = await supabase
            .from('orders')
            .select('*, order_items (*)')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []) as Order[];
    },

    updateOrderStatus: async (orderId: string, status: string, estimatedReadyAt?: string) => {
        const payload: Record<string, any> = { status, updated_at: new Date().toISOString() };
        if (estimatedReadyAt) payload.estimated_ready_at = estimatedReadyAt;
        const { data, error } = await supabase
            .from('orders')
            .update(payload)
            .eq('id', orderId)
            .select()
            .single();
        if (error) throw error;

        // Send SMS notifications if status is READY or COMPLETED
        if (data.phone) {
            if (status === 'READY') {
                smsService.sendOrderReadyNotification(data.phone, data.token_number)
                    .catch(err => console.error('Error sending ready SMS:', err));
            } else if (status === 'COMPLETED') {
                smsService.sendOrderCompletedNotification(data.phone, data.token_number)
                    .catch(err => console.error('Error sending completed SMS:', err));
            }
        }

        return data;
    },

    assignChef: async (orderId: string, chefId: string | null) => {
        const { data, error } = await supabase
            .from('orders')
            .update({ chef_id: chefId, updated_at: new Date().toISOString() })
            .eq('id', orderId)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    subscribeToAllOrders: (callback: (payload: any) => void) => {
        return supabase
            .channel('admin_all_orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, callback)
            .subscribe();
    },

    getAllCustomerPhones: async (): Promise<string[]> => {
        const { data, error } = await supabase
            .from('orders')
            .select('phone')
            .not('phone', 'is', null);

        if (error) throw error;

        // Return unique phone numbers
        const phones = data.map(o => o.phone).filter(Boolean) as string[];
        return Array.from(new Set(phones));
    },
};

export interface MenuItem {
    id: string;
    name: string;
    description?: string;
    price: number;
    image_url?: string;
    category: string;
    is_veg: boolean;
    is_best_seller: boolean;
    is_today_special: boolean;
    is_available: boolean;
    prep_time_minutes: number;
    discount_percent: number;
    created_at: string;
}

export const menuService = {
    getAll: async (): Promise<MenuItem[]> => {
        const { data, error } = await supabase
            .from('menu_items')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []) as MenuItem[];
    },

    uploadImage: async (file: File): Promise<string> => {
        const ext = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage
            .from('menu-images')
            .upload(fileName, file, { upsert: true });
        if (error) throw error;
        const { data } = supabase.storage.from('menu-images').getPublicUrl(fileName);
        return data.publicUrl;
    },

    create: async (item: Omit<MenuItem, 'id' | 'created_at'>, imageFile?: File): Promise<MenuItem> => {
        let image_url = item.image_url;
        if (imageFile) {
            image_url = await menuService.uploadImage(imageFile);
        }
        const { data, error } = await supabase
            .from('menu_items')
            .insert({ ...item, image_url })
            .select()
            .single();
        if (error) throw error;
        return data as MenuItem;
    },

    update: async (id: string, item: Partial<Omit<MenuItem, 'id' | 'created_at'>>, imageFile?: File): Promise<MenuItem> => {
        let updates = { ...item };
        if (imageFile) {
            updates.image_url = await menuService.uploadImage(imageFile);
        }
        const { data, error } = await supabase
            .from('menu_items')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as MenuItem;
    },

    delete: async (id: string): Promise<void> => {
        const { error } = await supabase.from('menu_items').delete().eq('id', id);
        if (error) throw error;
    },

    toggleAvailability: async (id: string, is_available: boolean): Promise<void> => {
        const { error } = await supabase
            .from('menu_items')
            .update({ is_available })
            .eq('id', id);
        if (error) throw error;
    },
};

export const customizationService = {
    getItemOptions: async (menuItemId: string): Promise<CustomizationOption[]> => {
        const { data, error } = await supabase
            .from('customization_options')
            .select('*')
            .eq('menu_item_id', menuItemId)
            .order('name');
        if (error) throw error;
        return data.map(opt => ({
            id: opt.id,
            menu_item_id: opt.menu_item_id,
            name: opt.name,
            price: Number(opt.price),
            isAvailable: opt.is_available
        }));
    },

    addOption: async (menuItemId: string, option: Omit<CustomizationOption, 'id' | 'menu_item_id'>) => {
        const { data, error } = await supabase
            .from('customization_options')
            .insert({
                menu_item_id: menuItemId,
                name: option.name,
                price: option.price,
                is_available: option.isAvailable
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    updateOption: async (id: string, updates: Partial<CustomizationOption>) => {
        const { data, error } = await supabase
            .from('customization_options')
            .update({
                name: updates.name,
                price: updates.price,
                is_available: updates.isAvailable
            })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    deleteOption: async (id: string) => {
        const { error } = await supabase
            .from('customization_options')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
};

export interface Chef {
    id: string;
    name: string;
    is_available: boolean;
    current_assigned_orders: number;
    created_at: string;
}

export const chefService = {
    getAll: async (): Promise<Chef[]> => {
        const { data, error } = await supabase
            .from('chefs')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []) as Chef[];
    },

    create: async (chef: Omit<Chef, 'id' | 'created_at' | 'current_assigned_orders'>): Promise<Chef> => {
        const { data, error } = await supabase
            .from('chefs')
            .insert(chef)
            .select()
            .single();
        if (error) throw error;
        return data as Chef;
    },

    update: async (id: string, updates: Partial<Chef>): Promise<Chef> => {
        const { data, error } = await supabase
            .from('chefs')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as Chef;
    },

    delete: async (id: string): Promise<void> => {
        const { error } = await supabase.from('chefs').delete().eq('id', id);
        if (error) throw error;
    }
};

// ─── Rating / Review types & service ─────────────────────────────────────────
export interface FoodRating {
    id: string;
    menu_item_id: string;
    order_id?: string;
    user_id?: string;
    rating: number;          // 1–5
    comment?: string;
    is_anonymous: boolean;
    created_at: string;
    // joined fields
    menu_item_data?: { name: string; image_url?: string };
}

export const ratingService = {
    /** Fetch all reviews (newest first), joined with menu_item name */
    getAll: async (): Promise<FoodRating[]> => {
        const { data, error } = await supabase
            .from('food_ratings')
            .select(`
                *,
                menu_items ( name, image_url )
            `)
            .order('created_at', { ascending: false });
        if (error) throw error;
        // Flatten joined data
        return ((data || []) as any[]).map((r) => ({
            ...r,
            menu_item_data: r.menu_items ?? undefined,
            menu_items: undefined,
        })) as FoodRating[];
    },

    /** Fetch reviews for a specific menu item */
    getByMenuItem: async (menuItemId: string): Promise<FoodRating[]> => {
        const { data, error } = await supabase
            .from('food_ratings')
            .select('*')
            .eq('menu_item_id', menuItemId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []) as FoodRating[];
    },

    /** Admin: delete a review */
    deleteReview: async (id: string): Promise<void> => {
        const { error } = await supabase.from('food_ratings').delete().eq('id', id);
        if (error) throw error;
    },

    /** Admin: subscribe to new reviews in real-time */
    subscribeToReviews: (callback: (payload: any) => void) => {
        return supabase
            .channel('food_ratings_admin')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'food_ratings' }, callback)
            .subscribe();
    },
};
