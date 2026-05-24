import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { MenuItem } from '@/types/food';

// Helper to calculate best sellers based on order data
const calculateBestSellers = (items: MenuItem[], orders: any[]): Set<string> => {
    if (!orders.length) {
        return new Set();
    }
    
    // Count quantity sold per menu item
    const salesCount: Record<string, number> = {};
    orders.forEach(order => {
        order.order_items?.forEach((oi: any) => {
            salesCount[oi.menu_item_id] = (salesCount[oi.menu_item_id] || 0) + oi.quantity;
        });
    });
    
    if (Object.keys(salesCount).length === 0) {
        return new Set();
    }
    
    // Find max sales count
    const maxSales = Math.max(...Object.values(salesCount));
    
    if (maxSales === 0) {
        return new Set();
    }
    
    // Items with sales >= 80% of max are considered best sellers
    const threshold = maxSales * 0.8;
    
    const bestSellers = new Set<string>();
    
    Object.entries(salesCount).forEach(([itemId, count]) => {
        if (count >= threshold) {
            bestSellers.add(itemId);
        }
    });
    
    return bestSellers;
};

// Map DB row → MenuItem used by the frontend
const mapRow = (row: any): MenuItem => ({
    id: row.id,
    name: row.name,
    description: row.description || '',
    price: row.price,
    image: row.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
    category: row.category || 'Other',
    isVeg: row.is_veg ?? true,
    isBestSeller: row.is_best_seller ?? false, // Will be overridden by calculation
    isTodaySpecial: row.is_today_special ?? false,
    rating: row.avg_rating ?? 0,
    avgRating: row.avg_rating ?? 0,
    ratingCount: row.rating_count ?? 0,
    prepTime: row.prep_time_minutes ?? 15,
    available: row.is_available ?? true,
    discountPercent: row.discount_percent ?? 0,
    tags: [],
});

export const useMenuItems = (_params?: {
    vendor_id?: string;
    category_id?: string;
    food_type?: string;
    is_special?: boolean;
    is_best_seller?: boolean;
}) => {
    const [items, setItems] = useState<MenuItem[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchItems = async () => {
        try {
            setLoading(true);
            const [menuData, ordersData] = await Promise.all([
                supabase
                    .from('menu_items')
                    .select('*')
                    .eq('is_available', true)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('orders')
                    .select('*, order_items (*)')
                    .order('created_at', { ascending: false })
            ]);
            
            if (menuData.error) throw menuData.error;
            if (ordersData.error) throw ordersData.error;
            
            const menuItems = (menuData.data || []).map(mapRow);
            const orderItems = ordersData.data || [];
            
            // Calculate best sellers dynamically
            const bestSellers = calculateBestSellers(menuItems, orderItems);
            const itemsWithBestSeller = menuItems.map(item => ({
                ...item,
                isBestSeller: bestSellers.has(item.id)
            }));
            
            setItems(itemsWithBestSeller);
            setOrders(orderItems);
            setError(null);
        } catch (e: any) {
            setError(e.message || 'Failed to fetch menu items');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();

        // Real-time: refresh on any menu_items change
        const channel = supabase
            .channel('menu_items_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => {
                fetchItems();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    return { items, loading, error, refetch: fetchItems };
};

export const useSearchMenu = () => {
    const [results, setResults] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(false);

    const search = async (query: string) => {
        if (query.length < 2) { setResults([]); return; }
        try {
            setLoading(true);
            const { data } = await supabase
                .from('menu_items')
                .select('*')
                .ilike('name', `%${query}%`)
                .eq('is_available', true)
                .limit(20);
            setResults((data || []).map(mapRow));
        } catch {
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    return { results, loading, search };
};

// Re-export MenuItem for anything that imports it from this hook
export type { MenuItem };


