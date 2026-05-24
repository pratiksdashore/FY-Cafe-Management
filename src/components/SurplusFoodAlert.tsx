import { useEffect, useState } from 'react';
import { Bell, X, Clock, Percent } from 'lucide-react';
import { subscribeToSurplusFood } from '@/services/supabase';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

interface SurplusItem {
    id: string;
    menu_item_id: string;
    menu_item_name: string;
    surplus_quantity: number;
    discount_percentage: number;
    discount_price: number;
    expires_at: string;
    created_at: string;
}

export const SurplusFoodAlert = () => {
    const [alerts, setAlerts] = useState<SurplusItem[]>([]);
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());

    useEffect(() => {
        // Subscribe to surplus food alerts
        const subscription = subscribeToSurplusFood((payload) => {
            const newAlert = payload.new as any;

            setAlerts((prev) => [
                {
                    id: newAlert.id,
                    menu_item_id: newAlert.menu_item_id,
                    menu_item_name: 'Surplus Item', // Will be fetched from menu_items
                    surplus_quantity: newAlert.surplus_quantity,
                    discount_percentage: newAlert.discount_percentage,
                    discount_price: newAlert.discount_price,
                    expires_at: newAlert.expires_at,
                    created_at: newAlert.created_at,
                },
                ...prev,
            ]);

            // Show browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('🍽️ Surplus Food Alert!', {
                    body: `Save ${newAlert.discount_percentage}% on surplus food! Limited quantity available.`,
                    icon: '/logo.png',
                });
            }
        });

        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const getTimeRemaining = (expiresAt: string) => {
        const now = new Date();
        const expires = new Date(expiresAt);
        const diff = expires.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    };

    const handleDismiss = (id: string) => {
        setDismissed((prev) => new Set(prev).add(id));
    };

    const visibleAlerts = alerts.filter((alert) => !dismissed.has(alert.id));

    if (visibleAlerts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm space-y-2">
            {visibleAlerts.map((alert) => (
                <div
                    key={alert.id}
                    className={cn(
                        'bg-gradient-to-r from-green-500/10 to-emerald-500/10',
                        'border-2 border-green-500/30 rounded-2xl p-4',
                        'shadow-lg backdrop-blur-sm',
                        'animate-slide-in-right'
                    )}
                >
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                            <Bell className="w-5 h-5 text-green-600 animate-bounce" />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-sm">🍽️ Surplus Food Alert!</h4>
                                <button
                                    onClick={() => handleDismiss(alert.id)}
                                    className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <p className="text-sm text-muted-foreground mb-3">
                                Save food, save money! Limited quantity available.
                            </p>

                            <div className="flex items-center gap-4 mb-3">
                                <div className="flex items-center gap-1 text-green-600">
                                    <Percent className="w-4 h-4" />
                                    <span className="font-bold text-lg">{alert.discount_percentage}%</span>
                                    <span className="text-xs">OFF</span>
                                </div>

                                <div className="flex items-center gap-1 text-muted-foreground text-xs">
                                    <Clock className="w-3 h-3" />
                                    <span>Expires in {getTimeRemaining(alert.expires_at)}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                    Only {alert.surplus_quantity} left
                                </span>
                                <Button
                                    size="sm"
                                    className="ml-auto bg-green-600 hover:bg-green-700"
                                >
                                    View Deals
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
