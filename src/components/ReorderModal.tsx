import { useState } from 'react';
import { X, Loader2, AlertTriangle, ShoppingCart } from 'lucide-react';
import { Button } from './ui/button';
import { api } from '@/services/api';
import { smsService } from '@/services/sms';
import { orderService } from '@/services/supabase';
import { toast } from '@/hooks/use-toast';
import { Order } from '@/hooks/useOrders';
import { useNavigate } from 'react-router-dom';

interface ReorderModalProps {
    order: Order;
    onClose: () => void;
}

export const ReorderModal = ({ order, onClose }: ReorderModalProps) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [unavailableItems, setUnavailableItems] = useState<string[]>([]);
    const [pickupTime, setPickupTime] = useState('');

    const handleReorder = async () => {
        if (!pickupTime) {
            toast({
                title: 'Pickup time required',
                description: 'Please select a pickup time',
                variant: 'destructive',
            });
            return;
        }

        try {
            setLoading(true);

            // Check item availability
            const unavailable: string[] = [];
            for (const item of order.order_items) {
                try {
                    const response = await api.getMenuItemById(item.menu_item.id);
                    if (!response.data.data.is_available || response.data.data.stock_quantity === 0) {
                        unavailable.push(item.menu_item.name);
                    }
                } catch (err) {
                    unavailable.push(item.menu_item.name);
                }
            }

            if (unavailable.length > 0) {
                setUnavailableItems(unavailable);
                toast({
                    title: 'Some items unavailable',
                    description: `${unavailable.length} item(s) are currently out of stock`,
                    variant: 'destructive',
                });
                return;
            }

            // Create new order with same items
            const response = await api.createOrder({
                vendor_id: order.vendor.id,
                items: order.order_items.map((item) => ({
                    menu_item_id: item.menu_item.id,
                    quantity: item.quantity,
                    special_instructions: item.special_instructions,
                })),
                pickup_time: pickupTime,
            });

            // Calculate wait time for the new order
            const waitMinutes = await orderService.calculateWaitTime(order.order_items.map(oi => oi.menu_item_data || oi.menu_item));

            // Send SMS notification
            try {
                await smsService.sendOrderConfirmation({
                    to: order.phone || '',
                    tokenNumber: response.data.data.token_number,
                    waitMinutes: waitMinutes,
                    totalAmount: order.final_amount,
                    itemsCount: order.order_items.length,
                });
            } catch (smsError: any) {
                console.warn('Failed to send SMS notification for reorder:', smsError.message);
            }

            toast({
                title: '✅ Order placed!',
                description: `Your order has been placed successfully. Wait time: ${waitMinutes} mins`,
            });

            // Navigate to order confirmation
            navigate('/order-confirmation', {
                state: {
                    token: response.data.data.token_number,
                    orderId: response.data.data.id,
                    total: order.final_amount,
                    items: order.order_items.length,
                    waitTime: waitMinutes
                },
            });
        } catch (err: any) {
            toast({
                title: 'Failed to reorder',
                description: err.response?.data?.error || 'Please try again',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    // Generate time slots (next 2 hours in 15-min intervals)
    const generateTimeSlots = () => {
        const slots: string[] = [];
        const now = new Date();
        const roundedMinutes = Math.ceil(now.getMinutes() / 15) * 15;
        now.setMinutes(roundedMinutes + 30); // Start 30 minutes from now
        now.setSeconds(0);

        for (let i = 0; i < 8; i++) {
            const time = new Date(now.getTime() + i * 15 * 60 * 1000);
            slots.push(time.toISOString());
        }

        return slots;
    };

    const timeSlots = generateTimeSlots();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-card rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-card border-b p-4 flex items-center justify-between">
                    <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5" />
                        Reorder
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Items List */}
                    <div>
                        <h4 className="font-semibold mb-3">Items to reorder</h4>
                        <div className="space-y-2">
                            {order.order_items.map((item) => {
                                const isUnavailable = unavailableItems.includes(item.menu_item.name);

                                return (
                                    <div
                                        key={item.id}
                                        className={`flex items-center justify-between p-3 rounded-lg ${isUnavailable ? 'bg-destructive/10' : 'bg-muted/50'
                                            }`}
                                    >
                                        <div className="flex-1">
                                            <p className="font-medium">{item.menu_item.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Qty: {item.quantity} × ₹{item.unit_price}
                                            </p>
                                        </div>
                                        {isUnavailable && (
                                            <AlertTriangle className="w-5 h-5 text-destructive" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Unavailable Warning */}
                    {unavailableItems.length > 0 && (
                        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-sm text-destructive mb-1">
                                        Items Unavailable
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Some items are out of stock. Please remove them or try again later.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Pickup Time */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Pickup Time <span className="text-destructive">*</span>
                        </label>
                        <select
                            value={pickupTime}
                            onChange={(e) => setPickupTime(e.target.value)}
                            className="w-full p-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                            <option value="">Select time</option>
                            {timeSlots.map((slot) => {
                                const time = new Date(slot);
                                const formatted = time.toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true,
                                });
                                return (
                                    <option key={slot} value={slot}>
                                        {formatted}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    {/* Total */}
                    <div className="border-t pt-4">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-muted-foreground">Total</span>
                            <span className="font-display font-bold text-xl">₹{order.final_amount}</span>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={onClose}
                                className="flex-1"
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleReorder}
                                className="flex-1"
                                disabled={loading || unavailableItems.length > 0 || !pickupTime}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Placing Order...
                                    </>
                                ) : (
                                    'Place Order'
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
