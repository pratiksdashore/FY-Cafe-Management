import { useState, useEffect, useCallback } from 'react';
import { orderService, Order } from '../lib/supabase';

export const useAllOrders = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOrders = useCallback(async () => {
        try {
            setLoading(true);
            const data = await orderService.getAllOrders();
            setOrders(data);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch orders');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    // Real-time updates
    useEffect(() => {
        const sub = orderService.subscribeToAllOrders((payload) => {
            const updated = payload.new as Order;
            if (payload.eventType === 'INSERT') {
                setOrders((prev) => [updated, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
                setOrders((prev) =>
                    prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
                );
            }
        });
        return () => { sub.unsubscribe(); };
    }, []);

    return { orders, loading, error, refetch: fetchOrders };
};
