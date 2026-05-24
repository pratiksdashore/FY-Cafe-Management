import { useState, useEffect, useCallback } from 'react';
import { orderService } from '@/services/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast } from './use-toast';
import { smsService } from '@/services/sms';

export interface OrderItem {
    id: string;
    order_id: string;
    menu_item_id: string;
    menu_item_data: {
        id: string;
        name: string;
        image?: string;
        price: number;
    };
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
    order_items: OrderItem[];
}

// Hook for users: fetch their own orders with real-time updates
export const useOrders = () => {
    const { user, isAuthenticated } = useAuth();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOrders = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            const data = await orderService.getUserOrders(user.id);
            setOrders(data as Order[]);
            setError(null);
        } catch (err: any) {
            const msg = err.message || 'Failed to fetch orders';
            setError(msg);
            toast({ title: 'Error', description: msg, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (isAuthenticated && user) {
            fetchOrders();
        } else {
            setOrders([]);
            setLoading(false);
        }
    }, [isAuthenticated, user, fetchOrders]);

    // Real-time updates
    useEffect(() => {
        if (!user) return;
        const subscription = orderService.subscribeToUserOrders(user.id, (payload) => {
            const updated = payload.new as Order;
            if (payload.eventType === 'INSERT') {
                setOrders((prev) => [updated, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
                setOrders((prev) =>
                    prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
                );
                if (updated.status === 'READY') {
                    toast({
                        title: '🎉 Order Ready!',
                        description: `Your order #${updated.token_number} is ready for pickup!`,
                    });
                }
            }
        });
        return () => { subscription.unsubscribe(); };
    }, [user]);

    return { orders, loading, error, refetch: fetchOrders };
};

// Hook for admin: fetch ALL orders with real-time updates
export const useAllOrders = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOrders = useCallback(async () => {
        try {
            setLoading(true);
            const data = await orderService.getAllOrders();
            setOrders(data as Order[]);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch orders');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    // Real-time updates for admin
    useEffect(() => {
        const subscription = orderService.subscribeToAllOrders((payload) => {
            const updated = payload.new as Order;
            if (payload.eventType === 'INSERT') {
                setOrders((prev) => [updated, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
                setOrders((prev) =>
                    prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
                );
            }
        });
        return () => { subscription.unsubscribe(); };
    }, []);

    return { orders, loading, error, refetch: fetchOrders };
};

export const getCancellationTimeRemaining = (createdAt: string): number => {
    const created = new Date(createdAt);
    const now = new Date();
    const elapsed = (now.getTime() - created.getTime()) / 1000 / 60; // minutes
    return Math.max(0, 2 - elapsed);
};

export const canCancelOrder = (order: Order): boolean => {
    if (order.status !== 'PLACED') return false;
    return getCancellationTimeRemaining(order.created_at) > 0;
};
