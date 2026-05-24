import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Clock,
  RefreshCw,
  ChefHat,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  ShoppingBag,
  Timer,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOrders, Order, canCancelOrder, getCancellationTimeRemaining } from '@/hooks/useOrders';
import { Header } from '@/components/food/Header';
import { orderService } from '@/services/supabase';
import { ReviewModal } from '@/components/ReviewModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from '@/hooks/use-toast';

// --- Countdown timer component ---
const CountdownTimer = ({ targetTime }: { targetTime: string }) => {
  const getRemaining = () => Math.max(0, Math.floor((new Date(targetTime).getTime() - Date.now()) / 1000));
  const [secs, setSecs] = useState(getRemaining);

  useEffect(() => {
    const t = setInterval(() => setSecs(getRemaining()), 1000);
    return () => clearInterval(t);
  }, [targetTime]);

  if (secs <= 0) return (
    <div className="flex items-center gap-2 text-green-600 font-semibold text-sm">
      <CheckCircle2 className="w-4 h-4" />
      Should be ready now!
    </div>
  );

  const mins = Math.floor(secs / 60);
  const remSecs = secs % 60;
  const totalSecs = Math.max(1, Math.floor((new Date(targetTime).getTime() - new Date(new Date(targetTime).getTime() - secs * 1000 - 0).getTime()) / 1000));
  // Approx progress: how far from start to end
  const elapsedFromStart = 1 - secs / Math.max(secs, 900); // rough 15min max
  const circumference = 2 * Math.PI * 20;
  const offset = circumference * (1 - Math.min(1, elapsedFromStart));

  return (
    <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl p-3">
      <div className="relative w-12 h-12 shrink-0">
        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="20" fill="none" stroke="#fed7aa" strokeWidth="4" />
          <circle
            cx="24" cy="24" r="20" fill="none"
            stroke="#f97316" strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <Timer className="absolute inset-0 m-auto w-5 h-5 text-orange-500" />
      </div>
      <div>
        <p className="text-xs text-orange-600 font-medium">Estimated ready in</p>
        <p className="font-display font-bold text-orange-700 text-2xl leading-none">
          {mins > 0 ? `${mins}m ` : ''}{remSecs.toString().padStart(2, '0')}s
        </p>
      </div>
    </div>
  );
};

const statusConfig: Record<Order['status'], { label: string; icon: any; color: string; dotColor: string }> = {
  PLACED: {
    label: 'Order Placed',
    icon: Clock,
    color: 'bg-golden-amber/10 text-golden-amber border-golden-amber/20',
    dotColor: 'bg-golden-amber',
  },
  PREPARING: {
    label: 'Preparing',
    icon: ChefHat,
    color: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    dotColor: 'bg-orange-500',
  },
  READY: {
    label: 'Ready for Pickup',
    icon: CheckCircle2,
    color: 'bg-green-500/10 text-green-500 border-green-500/20',
    dotColor: 'bg-green-500 animate-pulse',
  },
  COMPLETED: {
    label: 'Completed',
    icon: CheckCircle2,
    color: 'bg-muted text-muted-foreground border-border',
    dotColor: 'bg-muted-foreground',
  },
  CANCELLED: {
    label: 'Cancelled',
    icon: XCircle,
    color: 'bg-destructive/10 text-destructive border-destructive/20',
    dotColor: 'bg-destructive',
  },
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const Orders = () => {
  const navigate = useNavigate();
  const { orders, loading, error, refetch } = useOrders();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Track which item the review modal is open for
  const [reviewTarget, setReviewTarget] = useState<{
    orderId: string;
    menuItemId: string;
    menuItemName: string;
  } | null>(null);
  // Track which (orderId, menuItemId) pairs have been rated this session
  const [ratedItems, setRatedItems] = useState<Set<string>>(new Set());

  // Auto-refresh orders every 10 seconds to update cancellation timers
  useEffect(() => {
    const interval = setInterval(() => {
      // Small trick to trigger re-renders for timers without full fetch
      setIsRefreshing(prev => !prev);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCancelOrder = async (orderId: string) => {
    try {
      await orderService.cancelOrder(orderId);
      toast({
        title: "Order Cancelled",
        description: "Your order has been cancelled successfully.",
      });
      refetch();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to cancel order",
        variant: "destructive",
      });
    } finally {
      setCancellingId(null);
    }
  };

  const activeOrders = orders.filter((o) =>
    ['PLACED', 'PREPARING', 'READY'].includes(o.status)
  );
  const pastOrders = orders.filter((o) =>
    ['COMPLETED', 'CANCELLED'].includes(o.status)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header onCartClick={() => { }} />
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading your orders...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header onCartClick={() => { }} />
        <div className="flex items-center justify-center py-32">
          <div className="text-center max-w-md px-4">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h3 className="font-display font-semibold text-lg mb-2">Failed to Load Orders</h3>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={refetch}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onCartClick={() => { }} />

      {/* Sub-header */}
      <div className="sticky top-16 z-40 bg-background/80 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4 max-w-2xl">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display font-bold text-xl flex-1">My Orders</h1>
          <Button variant="ghost" size="icon" onClick={refetch}>
            <RefreshCw className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Active Orders */}
        {activeOrders.length > 0 && (
          <section className="mb-8">
            <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse inline-block" />
              Active Orders
            </h2>
            <div className="space-y-4">
              {activeOrders.map((order) => {
                const config = statusConfig[order.status];
                const StatusIcon = config.icon;
                return (
                  <div
                    key={order.id}
                    className={cn(
                      'bg-card rounded-2xl border p-6',
                      order.status === 'READY' && 'ring-2 ring-green-500'
                    )}
                  >
                    {/* Item Name & Status */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="font-display font-bold text-3xl text-black leading-tight">
                          {order.order_items.map(i => i.menu_item_data?.name).filter(Boolean).join(', ')}
                        </p>
                        <p className="text-red-600 text-xs mt-1 font-semibold">Token #{order.token_number}</p>
                      </div>
                      <div className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium',
                        config.color
                      )}>
                        <div className={cn('w-2 h-2 rounded-full', config.dotColor)} />
                        <StatusIcon className="w-3.5 h-3.5" />
                        {config.label}
                      </div>
                    </div>

                    {/* Items */}
                    <div className="space-y-1 mb-4">
                      {order.order_items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {item.quantity}x {item.menu_item_data?.name}
                          </span>
                          <span>₹{item.subtotal}</span>
                        </div>
                      ))}
                    </div>

                    {/* Countdown timer / Pre-order schedule */}
                    {(order.status === 'PREPARING' || order.status === 'PLACED') && (
                      order.scheduled_at ? (
                        <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center gap-3">
                          <span className="text-xl">🗓</span>
                          <div>
                            <p className="text-xs text-purple-600 font-medium">Pre-order scheduled for</p>
                            <p className="font-semibold text-purple-800 text-sm">
                              {new Date(order.scheduled_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                            </p>
                          </div>
                        </div>
                      ) : order.estimated_ready_at ? (
                        <div className="mb-4">
                          <CountdownTimer targetTime={order.estimated_ready_at} />
                        </div>
                      ) : null
                    )}

                    {/* Ready message */}
                    {order.status === 'READY' && (
                      <div className="mb-4 p-3 bg-green-500/10 rounded-xl flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                        <p className="font-semibold text-sm text-green-600">
                          🎉 Your order is ready for pickup!
                        </p>
                      </div>
                    )}

                    {/* Placed — waiting message (only for non-preorders) */}
                    {order.status === 'PLACED' && !order.scheduled_at && (
                      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse shrink-0" />
                        <p className="text-sm text-yellow-800">
                          Order received — waiting for the kitchen to confirm
                        </p>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="border-t pt-4 flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                      <p className="font-display font-bold text-lg">₹{order.total_amount}</p>
                    </div>

                    {/* Cancellation Button */}
                    {canCancelOrder(order) && (
                      <div className="mt-4 pt-4 border-t flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 border-destructive/20"
                          onClick={() => setCancellingId(order.id)}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Cancel Order ({Math.ceil(getCancellationTimeRemaining(order.created_at))}m left)
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Cancellation Confirmation Dialog */}
        <AlertDialog open={!!cancellingId} onOpenChange={(open) => !open && setCancellingId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will cancel your order. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Order</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => cancellingId && handleCancelOrder(cancellingId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Yes, Cancel Order
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Past Orders */}
        {pastOrders.length > 0 && (
          <section>
            <h2 className="font-display font-semibold text-lg mb-4">Past Orders</h2>
            <div className="space-y-3">
              {pastOrders.map((order) => {
                const config = statusConfig[order.status];
                return (
                  <div key={order.id} className="bg-card rounded-xl border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">Token #{order.token_number}</p>
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full border',
                            config.color
                          )}>
                            {config.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                      </div>
                      <p className="font-bold text-lg shrink-0 ml-4">₹{order.total_amount}</p>
                    </div>

                    {/* Items with Rate button for COMPLETED orders */}
                    <div className="space-y-2">
                      {order.order_items.map((item) => {
                        const rateKey = `${order.id}__${item.menu_item_id}`;
                        const alreadyRated = ratedItems.has(rateKey);
                        return (
                          <div key={item.id} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {item.quantity}× {item.menu_item_data?.name}
                            </span>
                            {order.status === 'COMPLETED' && (
                              alreadyRated ? (
                                <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Rated
                                </span>
                              ) : (
                                <button
                                  onClick={() => setReviewTarget({
                                    orderId: order.id,
                                    menuItemId: item.menu_item_id,
                                    menuItemName: item.menu_item_data?.name ?? 'Item',
                                  })}
                                  className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium hover:underline transition-colors"
                                >
                                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                  Rate
                                </button>
                              )
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Empty state */}
        {orders.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2">No orders yet</h3>
            <p className="text-muted-foreground mb-6">
              Place your first order to see it here
            </p>
            <Button onClick={() => navigate('/')}>Browse Menu</Button>
          </div>
        )}
      </main>

      {/* Review Modal */}
      {reviewTarget && (
        <ReviewModal
          orderId={reviewTarget.orderId}
          menuItemId={reviewTarget.menuItemId}
          menuItemName={reviewTarget.menuItemName}
          onClose={() => setReviewTarget(null)}
          onSuccess={() => {
            setRatedItems((prev) => new Set(prev).add(`${reviewTarget.orderId}__${reviewTarget.menuItemId}`));
          }}
        />
      )}
    </div>
  );
};

export default Orders;
