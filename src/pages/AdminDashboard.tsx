import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
    LayoutDashboard,
    ShoppingBag,
    BarChart3,
    Settings,
    LogOut,
    Menu,
    X,
    RefreshCw,
    Loader2,
    ChevronDown,
} from 'lucide-react';
import { api } from '@/services/api';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAllOrders, Order } from '@/hooks/useOrders';
import { orderService } from '@/services/supabase';

const STATUS_OPTIONS = ['PLACED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'] as const;

const statusColors: Record<Order['status'], string> = {
    PLACED: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    PREPARING: 'bg-orange-100 text-orange-800 border-orange-200',
    READY: 'bg-green-100 text-green-800 border-green-200',
    COMPLETED: 'bg-gray-100 text-gray-700 border-gray-200',
    CANCELLED: 'bg-red-100 text-red-700 border-red-200',
};

const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
    });

// --- Orders Panel ---
const OrdersPanel = () => {
    const { orders, loading, error, refetch } = useAllOrders();
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    // For the "set estimated minutes" modal per order
    const [estimateMap, setEstimateMap] = useState<Record<string, string>>({}); // orderId -> minutes string

    const filtered = filterStatus === 'ALL'
        ? orders
        : orders.filter((o) => o.status === filterStatus);

    const handleStatusChange = async (orderId: string, newStatus: string) => {
        let estimatedReadyAt: string | undefined;
        if (newStatus === 'PREPARING') {
            const mins = parseInt(estimateMap[orderId] || '15', 10);
            estimatedReadyAt = new Date(Date.now() + mins * 60 * 1000).toISOString();
        }
        setUpdatingId(orderId);
        try {
            await orderService.updateOrderStatus(orderId, newStatus, estimatedReadyAt);
            toast({ title: 'Status Updated', description: `Order marked as ${newStatus}` });
            refetch();
        } catch (e: any) {
            toast({ title: 'Update Failed', description: e.message, variant: 'destructive' });
        } finally {
            setUpdatingId(null);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );
    if (error) return <div className="text-center py-12 text-destructive">{error}</div>;

    return (
        <div>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="flex flex-wrap gap-2">
                    {['ALL', ...STATUS_OPTIONS].map((s) => (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            className={cn(
                                'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                                filterStatus === s
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-muted border-transparent hover:bg-muted/80'
                            )}
                        >
                            {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                            <span className="ml-1.5 text-xs opacity-70">
                                ({s === 'ALL' ? orders.length : orders.filter(o => o.status === s).length})
                            </span>
                        </button>
                    ))}
                </div>
                <Button variant="ghost" size="sm" onClick={refetch} className="ml-auto">
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Refresh
                </Button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                {STATUS_OPTIONS.map((s) => {
                    const count = orders.filter((o) => o.status === s).length;
                    return (
                        <div key={s} className={cn('rounded-xl border p-3 text-center', statusColors[s])}>
                            <p className="text-2xl font-bold">{count}</p>
                            <p className="text-xs mt-0.5">{s.charAt(0) + s.slice(1).toLowerCase()}</p>
                        </div>
                    );
                })}
            </div>

            {/* Orders */}
            {filtered.length === 0 ? (
                <div className="text-center text-muted-foreground py-10">No orders found</div>
            ) : (
                <div className="space-y-4">
                    {filtered.map((order) => (
                        <div key={order.id} className="bg-background rounded-xl border p-5">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                {/* Token & info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-3xl font-display font-bold text-primary">
                                            #{order.token_number}
                                        </span>
                                        <span className={cn('px-2.5 py-0.5 rounded-full border text-xs font-semibold', statusColors[order.status])}>
                                            {order.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-2">
                                        {order.phone && <span className="mr-3">📱 {order.phone}</span>}
                                        🕐 {formatDate(order.created_at)}
                                    </p>
                                    {order.estimated_ready_at && (
                                        <p className="text-sm text-orange-600 font-medium mb-2">
                                            ⏱ Ready by: {new Date(order.estimated_ready_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                        </p>
                                    )}
                                    <div className="space-y-0.5">
                                        {order.order_items.map((item) => (
                                            <p key={item.id} className="text-sm">
                                                {item.quantity}× {item.menu_item_data?.name}
                                                <span className="text-muted-foreground ml-2">₹{item.subtotal}</span>
                                            </p>
                                        ))}
                                    </div>
                                </div>

                                {/* Right: total + controls */}
                                <div className="flex flex-col items-end gap-2 shrink-0">
                                    <p className="font-display font-bold text-xl">₹{order.total_amount}</p>

                                    {/* Estimated minutes input — only shown when status is PLACED */}
                                    {order.status === 'PLACED' && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <label className="text-muted-foreground whitespace-nowrap">Ready in</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="120"
                                                value={estimateMap[order.id] ?? '15'}
                                                onChange={(e) => setEstimateMap(prev => ({ ...prev, [order.id]: e.target.value }))}
                                                className="w-16 px-2 py-1 rounded-lg border text-sm text-center"
                                            />
                                            <span className="text-muted-foreground">min</span>
                                        </div>
                                    )}

                                    {/* Status selector */}
                                    <div className="relative">
                                        <select
                                            value={order.status}
                                            disabled={updatingId === order.id || ['COMPLETED', 'CANCELLED'].includes(order.status)}
                                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                            className={cn(
                                                'appearance-none pl-3 pr-8 py-2 rounded-lg border text-sm font-medium cursor-pointer transition-all',
                                                statusColors[order.status],
                                                'disabled:opacity-50 disabled:cursor-not-allowed'
                                            )}
                                        >
                                            {STATUS_OPTIONS.map((s) => (
                                                <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 pointer-events-none" />
                                        {updatingId === order.id && (
                                            <Loader2 className="absolute right-2 top-2.5 w-4 h-4 animate-spin" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- Admin Dashboard Page ---
const AdminDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState('orders');

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) setUser(JSON.parse(userStr));
    }, []);

    const handleLogout = async () => {
        try {
            await api.logout();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            toast({ title: 'Logged out', description: 'You have been successfully logged out' });
            navigate('/login');
        } catch {
            toast({ title: 'Logout failed', description: 'Please try again', variant: 'destructive' });
        }
    };

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'orders', label: 'Orders', icon: ShoppingBag },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-background flex">
            {/* Sidebar */}
            <aside className={cn(
                'fixed lg:static inset-y-0 left-0 z-50 bg-card border-r transition-all duration-300',
                sidebarOpen ? 'w-64' : 'w-0 lg:w-20 overflow-hidden'
            )}>
                <div className="h-full flex flex-col">
                    {/* Logo */}
                    <div className="p-4 border-b flex items-center justify-between">
                        {sidebarOpen && (
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">🍽️</span>
                                <span className="font-display font-bold">Admin</span>
                            </div>
                        )}
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden">
                            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>

                    {/* Nav */}
                    <nav className="flex-1 p-4 space-y-2">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={cn(
                                        'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                                        activeTab === item.id
                                            ? 'bg-primary text-primary-foreground'
                                            : 'hover:bg-muted'
                                    )}
                                >
                                    <Icon className="w-5 h-5 shrink-0" />
                                    {sidebarOpen && <span>{item.label}</span>}
                                </button>
                            );
                        })}
                    </nav>

                    {/* User / Logout */}
                    <div className="p-4 border-t">
                        {sidebarOpen ? (
                            <div className="space-y-2">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <span className="font-semibold text-primary">
                                            {user?.full_name?.[0] || 'A'}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{user?.full_name || 'Admin'}</p>
                                        <p className="text-xs text-muted-foreground truncate">{user?.role || 'ADMIN'}</p>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
                                    <LogOut className="w-4 h-4 mr-2" />
                                    Logout
                                </Button>
                            </div>
                        ) : (
                            <button onClick={handleLogout} className="w-full p-2 hover:bg-muted rounded-xl">
                                <LogOut className="w-5 h-5 mx-auto" />
                            </button>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                {/* Header */}
                <header className="sticky top-0 z-40 bg-card border-b">
                    <div className="px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden">
                                <Menu className="w-6 h-6" />
                            </button>
                            <div>
                                <h1 className="font-display font-bold text-2xl">
                                    {menuItems.find((m) => m.id === activeTab)?.label}
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    Welcome back, {user?.full_name || 'Admin'}
                                </p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content */}
                <div className="p-6">
                    {activeTab === 'dashboard' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="bg-card rounded-2xl border p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-medium text-muted-foreground">Total Orders</h3>
                                    <ShoppingBag className="w-5 h-5 text-primary" />
                                </div>
                                <p className="text-3xl font-bold">—</p>
                                <p className="text-sm text-muted-foreground mt-2">Open the Orders tab to manage</p>
                            </div>
                            <div className="bg-card rounded-2xl border p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-medium text-muted-foreground">Revenue</h3>
                                    <BarChart3 className="w-5 h-5 text-primary" />
                                </div>
                                <p className="text-3xl font-bold">—</p>
                                <p className="text-sm text-muted-foreground mt-2">Analytics coming soon</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'orders' && (
                        <div className="bg-card rounded-2xl border p-6">
                            <h2 className="text-xl font-semibold mb-6">All Orders</h2>
                            <OrdersPanel />
                        </div>
                    )}

                    {activeTab === 'analytics' && (
                        <div className="bg-card rounded-2xl border p-6">
                            <h2 className="text-xl font-semibold mb-4">Analytics</h2>
                            <p className="text-muted-foreground">Analytics dashboard coming soon...</p>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="bg-card rounded-2xl border p-6">
                            <h2 className="text-xl font-semibold mb-4">Settings</h2>
                            <p className="text-muted-foreground">Settings interface coming soon...</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
